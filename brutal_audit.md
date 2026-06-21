# Brutal Audit — Field Visit Debrief Tool

*Evaluated against the [Context.md](file:///c:/Users/Musharraf/Documents/Debrief/Context.md) assignment brief and its 5 evaluation criteria.*

---

## TL;DR Verdict

You have a **structurally complete skeleton** that touches every phase (0–8) at a surface level. The architecture is sound, the form flow is well thought out, and the debrief generation pipeline is wired end-to-end. But **there are critical gaps that will undermine you in a demo**: no seed data (so the dashboard/map/patterns pages show nothing), no actual Claude integration (you're using Groq/Llama which wasn't in the spec), no LangChain (the spec says "FastAPI + LangChain"), your `.env` has real API keys committed, and several features are more "layout present" than "feature working." A half-functional Phase 5 with real data showing real patterns will beat a hollow Phase 8 that renders empty states everywhere.

---

## Scorecard Against the 5 Evaluation Criteria

| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1 | **Frictionless logging** | 🟡 7/10 | Stepper form is good. Remembers defaults. Geolocation + reverse geocoding works. But: village is *required* (L59 VisitForm.js) which is wrong for many field contexts; no loading feedback during geo lookup on the form itself; no success animation — it just silently redirects. |
| 2 | **Genuinely mobile-first** | 🟡 7/10 | Safe area padding, bottom nav, 48px tap targets — all present. But the dashboard table is *hidden on mobile* (`lg:hidden` → shows cards). The blocker heatmap has `min-w-[720px]` which means horizontal scroll on mobile. Sentiment trend is bars not a chart. These are manager screens but they should still work on a tablet. |
| 3 | **AI layer quality** | 🔴 4/10 | **This is the biggest gap.** The spec says Claude API for vision/summarization and LangChain for orchestration. You have neither. You're using Groq + Llama-4-Scout for everything. The vision model (`meta-llama/llama-4-scout-17b-16e-instruct`) is massively inferior to Claude for photo captioning and OCR. There's a heuristic fallback that's decent, but the *point of the assignment* is showing AI quality. Evaluators will test the debrief output. |
| 4 | **Pattern surfacing** | 🔴 3/10 | The endpoints exist. The UI exists. But with **zero seed data**, every pattern view renders "No blocker patterns yet" / "No sentiment trend yet." This is the *single biggest differentiator* per the brief, and right now it shows nothing. The blocker heatmap is also doing `district × block` grouping (L15 patterns.py) not `district × category` which muddies the analysis. |
| 5 | **Working end-to-end demo** | 🟡 6/10 | The happy path works: form → submit → upload media → generate debrief → view debrief. But the demo falls apart when you switch to manager view because there's no data. No seed script exists. You can't show patterns that "wouldn't be visible by reading 20 notebooks" when there are 0 notebooks. |

---

## Critical Issues (Fix These or Fail)

### 🔴 1. No Claude API / No LangChain — Spec violation

[config.py](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/config.py) and [llm_client.py](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/services/llm_client.py) are wired to Groq's OpenAI-compatible API using Llama models. The assignment brief explicitly says:

> **Vision & summarization:** Claude API (vision for photos/handwritten notes, text generation for the final structured debrief)
> **AI orchestration backend:** FastAPI + LangChain

- `anthropic` is not in [pyproject.toml](file:///c:/Users/Musharraf/Documents/Debrief/backend/pyproject.toml)
- `langchain` is not in `pyproject.toml`
- `langchain-anthropic` is not in `pyproject.toml`
- The LLM client ([llm_client.py](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/services/llm_client.py)) uses `httpx` against a generic OpenAI-compatible endpoint — no Anthropic SDK, no LangChain chain

**Why this matters:** The evaluator knows the spec. If they see Groq/Llama instead of Claude, it reads as "couldn't get Claude working" or "didn't read the brief." Llama-4-Scout's vision quality for OCR and field photo captioning is significantly worse than Claude Sonnet/Haiku.

---

### 🔴 2. Real API keys committed to `.env` in the repo

[.env](file:///c:/Users/Musharraf/Documents/Debrief/backend/.env) contains:
- Your full Supabase URL + anon key + **service role key** (line 1-3)
- Your ElevenLabs API key (line 12)
- Your Groq API key (line 21)
- A stray string on line 8: `73oOcXzq7CUX6yGV` — what is this? A leaked password?
- `ELEVENLABS_API_KEY` is defined TWICE (line 5 and line 12) with different values

> [!CAUTION]
> The `.env` file has `.git` in the directory. If you've committed this, your Supabase service role key and all API keys are compromised. The service role key bypasses RLS — anyone with it has full DB access. **Rotate these keys immediately.**

---

### 🔴 3. No seed data — Dashboard/Map/Patterns are empty shells

There is no `seed_data.py`, no fixture file, no SQL inserts. Without data:
- Dashboard shows "No debriefs found"
- Map shows "No geotagged visits"  
- Patterns shows "No blocker patterns yet" / "No sentiment trend yet"

The entire second half of the app (the part managers use) is untestable. The brief says *"pattern surfacing that adds value"* is the **single biggest differentiator**. You cannot demo differentiation with zero data.

---

### 🔴 4. Dashboard loads ALL data into memory for every request

[dashboard.py L86-119](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/routers/dashboard.py#L86-L119): `_combined_rows()` fetches up to 1000 visits, then all their debrief summaries, joins them in Python, and then applies sentiment/blocker/search filtering **in Python loops** (L122-141). The stats endpoint does the same full fetch.

- With 50 visits this is fine. With 500 it'll be slow. With 5000 it'll timeout.
- The `limit=1000` hardcap means you silently drop data for large deployments
- Blocker category filtering and text search should be SQL queries, not Python loops
- Every page load triggers **two** full-table scans (debriefs + stats)

This is acceptable for a prototype if you're honest about it, but it's a lurking problem.

---

## Serious Issues (Will Hurt You in Evaluation)

### 🟠 5. Media processing is synchronous and blocking

[media.py L47-63](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/routers/media.py#L47-L63): When you upload a voice memo, the API endpoint **blocks** while waiting for ElevenLabs to transcribe it. Then the debrief generation endpoint blocks while waiting for Claude/Groq. This means the form submit flow is:

1. POST /visits → fast
2. POST /media (voice) → **blocks 10-30s** for transcription
3. POST /media (photo) → **blocks 5-15s** for vision
4. POST /debrief → **blocks 10-20s** for LLM

Total: the user stares at "Saving and generating" for **30-60 seconds**. In a field with patchy connectivity, this could easily timeout. The brief says *"fast and low-effort, used standing in a field."*

**Mitigation:** At minimum, show per-media progress (you have `status: "uploading"` state but no `"processing"` state shown to the user). Better: fire-and-forget + poll, or use background tasks.

---

### 🟠 6. `block` was made optional but the schema is inconsistent

- [002_make_block_optional.sql](file:///c:/Users/Musharraf/Documents/Debrief/backend/migrations/002_make_block_optional.sql) exists
- `visit.py` has `block: str | None`
- But the `visits.py` filter uses `.eq("block", block)` which means filtering by `null` blocks will break
- The `_combined_rows` in dashboard.py also does `.eq("block", block)` — same issue

---

### 🟠 7. Vision uses Groq/Llama which is wrong for this use case

[vision.py](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/services/vision.py) sends base64 images to `chat_json()` which goes through `llm_client.py` to Groq. The `llm_vision_model` resolves to `meta-llama/llama-4-scout-17b-16e-instruct`.

Problems:
- Llama Scout's OCR quality on handwritten notes will be poor compared to Claude
- Photo captioning for field conditions (infrastructure damage, group activities) needs a model that can reason about visual context — Claude Sonnet is materially better
- If Groq is down or rate-limited, the fallback is "Image analysis skipped because no Groq/OpenAI-compatible AI key is configured." — silent failure in the debrief

---

### 🟠 8. `StakeholderTags` component doesn't exist

The implementation plan lists a `StakeholderTags.js` component. The actual form just uses inline badge buttons in [VisitForm.js L222-232](file:///c:/Users/Musharraf/Documents/Debrief/frontend/components/visit/VisitForm.js#L222-L232). This works but there's no ability to add custom stakeholders — only the hardcoded 8 from constants. The brief mentions "SHGs/VOs/CLFs, government line department staff" which covers your tags, but you should support custom entries for "Didi" names etc.

---

### 🟠 9. Sentiment trend visualization is misleading

[SentimentTrend.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/components/patterns/SentimentTrend.js) renders horizontal bars, not a time-series chart. The width formula `((score + 1) / 2) * 100` maps the -1..1 range to 0..100% width. This means:
- A "neutral" (0.0) visit shows as a 50% bar — looks positive
- A "mixed" (-0.5) visit shows as 25% — looks bad but isn't catastrophic
- You can't see **trends over time** because bars are just listed vertically

The brief says "sentiment trend over time per geography/program." A bar list isn't a trend. You need a line chart or at minimum a sparkline. This is supposed to show *temporal patterns* — are things getting better or worse in Darbhanga this month?

---

### 🟠 10. No date range filter on the dashboard

[FilterBar.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/components/dashboard/FilterBar.js) has: search, district (text input not dropdown!), program area, sentiment, blocker category. But **no date range picker** even though the backend supports `date_from` and `date_to`. For a manager reviewing "what happened this week" vs "this month," date filtering is essential.

---

## Moderate Issues (Polish Items That Add Up)

### 🟡 11. No `state` filter on dashboard

The filter bar has a district text input but no state dropdown. Given that your data spans 7 Indian states (Bihar, Jharkhand, Karnataka, MP, Odisha, Rajasthan, UP), a state-first filter cascade is critical. Typing "Darbhanga" in a text box and hoping it matches is fragile.

### 🟡 12. No error boundary / loading skeleton

Most pages have `LoadingPanel` but it's just text. No skeleton loading, no shimmer. The brief mentions this as a polish goal but the current loading states are bare-minimum.

### 🟡 13. PWA manifest references a non-existent icon

[manifest.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/app/manifest.js) references `/icons/icon.svg` but the icons directory may not contain this. The manifest also uses `manifest.js` (dynamic) but the layout references `/manifest.webmanifest` — these may not match.

### 🟡 14. The service worker is minimal

[sw.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/public/sw.js) exists at 994 bytes. For a field tool used "with patchy connectivity," even basic precaching of the app shell would be a big UX win. Currently it's likely just a stub.

### 🟡 15. No tests at all

Zero test files in either backend or frontend. No `tests/` directory, no `pytest`, no `jest`. The Context.md doesn't require tests, but for code quality assessment, having even 5 smoke tests for the API endpoints would show engineering rigor.

### 🟡 16. Duplicate tile map code

[TileLocationMap.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/components/visit/TileLocationMap.js) and [VisitMap.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/components/map/VisitMap.js) both implement a complete tile-based map from scratch with identical helper functions (`lonLatToPixel`, `pixelToLonLat`, `clamp`). This is ~250 lines of duplicated math. Factor into a shared `TileEngine`.

### 🟡 17. `RoleSwitcher` uses localStorage, not auth

The Field/Manager role toggle in [RoleSwitcher.js](file:///c:/Users/Musharraf/Documents/Debrief/frontend/components/layout/RoleSwitcher.js) is client-side only via localStorage. This is fine for a prototype but means anyone can switch to manager mode. There's no server-side role check. Acceptable if you're clear it's a demo toggle.

---

## What You Actually Got Right (Credit Where Due)

### ✅ Solid data model
The 3-table schema (`visits`, `media_items`, `debrief_summaries`) is well-designed. CHECK constraints on enums, proper cascading deletes, GIN index on JSONB blockers for future query optimization. This is good work.

### ✅ Heuristic fallback debrief
[debrief_chain.py L225-287](file:///c:/Users/Musharraf/Documents/Debrief/backend/app/services/debrief_chain.py#L225-L287) has a thoughtful `heuristic_debrief()` that generates a reasonable debrief from pillar statuses + keyword matching when the LLM is unavailable. This is defensive coding that will save the demo if the AI API is down.

### ✅ Robust LLM output normalization
The `normalize_debrief_payload()` function (L128-144) handles alias field names, type coercion, and category normalization. This is exactly the kind of defensive parsing you need when LLMs output slightly different JSON shapes.

### ✅ Custom tile map (zero dependencies)
Building a draggable, zoomable OpenStreetMap tile renderer from scratch with no library is impressive. It works for both the location picker and the map view. No Mapbox/Leaflet dependency = no API key requirement.

### ✅ Visit form UX touches
- Remembers visitor name + state + district in localStorage
- Session draft recovery (sessionStorage)
- State → district cascade with real Indian geography
- Reverse geocoding from GPS coordinates
- Forward geocoding from address fields
- Tap-to-cycle pillar statuses
- Media recorder with WebAudio API

### ✅ GeoJSON endpoint
The `format=geo` parameter on the dashboard endpoint that returns proper GeoJSON FeatureCollection is clean API design.

### ✅ Role-based navigation
The Field/Manager toggle that changes the bottom nav tabs is a nice UX touch that shows you understand the two user personas from the brief.

---

## Priority Fix List (If I Had to Ship Tomorrow)

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| **P0** | Create a seed script with 30-50 realistic visits + debriefs across multiple geographies | 2-3 hrs | **Massive** — unlocks dashboard, map, and patterns demos |
| **P0** | Add `anthropic` + `langchain` + `langchain-anthropic` to deps, wire Claude for debrief generation and vision | 2-3 hrs | Matches spec, dramatically improves AI output quality |
| **P0** | Remove real API keys from `.env`, add `.env` to `.gitignore`, rotate compromised keys | 15 min | Security |
| **P1** | Replace the sentiment trend bars with an actual line chart (even a simple Canvas-based one) | 1-2 hrs | Shows "trend over time" which is the whole point |
| **P1** | Add date range picker to FilterBar | 30 min | Essential manager workflow |
| **P1** | Add state dropdown to FilterBar (use the same `INDIA_STATES` constant) | 20 min | Matches the multi-state data model |
| **P2** | Add a "Generating debrief" animation/progress screen after form submit instead of blank loading | 1 hr | Reduces perceived wait time |
| **P2** | Fix `block` to use village/block in blocker patterns grouping (not `village || block`) | 20 min | Cleaner pattern aggregation |
| **P2** | Add skeleton loading states to dashboard + map | 1 hr | Polish |
| **P3** | Factor out shared tile map math into a utility | 30 min | Code quality |
| **P3** | Add 5-10 API smoke tests with pytest | 1-2 hrs | Engineering rigor |

---

## Bottom Line

You've built a complete surface-level prototype that touches every major feature area. The architecture is clean, the form UX has good mobile-first thinking, and the debrief pipeline is wired correctly. But **the two things that matter most for this assignment — AI quality (Claude, not Llama) and pattern surfacing (needs data) — are the two weakest areas**. Fix those, and you have a genuinely impressive demo. Leave them as-is, and you're showing empty dashboards powered by the wrong AI model.

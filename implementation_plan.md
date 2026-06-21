# Field Visit Debrief Tool — Implementation Plan

A mobile-first field intelligence tool that lets field staff log field visit observations (text, photos, video, voice memos, handwritten notes) and uses AI to generate structured debriefs. A manager dashboard aggregates debriefs to surface recurring patterns across geography and program areas.

**Stack:** Next.js (PWA) · FastAPI + LangChain · Supabase (Postgres + Storage + Auth) · ElevenLabs Scribe v2 · Claude API · Mapbox/Leaflet

---

## User Review Required

> [!IMPORTANT]
> **Supabase project**: You need to have a Supabase project already created. The plan assumes you'll supply `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

> [!IMPORTANT]
> **API keys needed**: Anthropic (Claude), ElevenLabs (Scribe v2), and optionally Mapbox (for map tiles). Please confirm you have these ready.

> [!WARNING]
> **ElevenLabs Scribe v2 pricing**: Voice/video transcription is billed per minute. For development, keep test files short (< 30s).

## Open Questions

1. **Map provider**: The context mentions Mapbox GL JS or Leaflet. Mapbox gives better-looking tiles but requires a token. Leaflet + OpenStreetMap is free. Which do you prefer?
2. **Deployment target**: Are you deploying the backend and frontend separately (e.g., Railway + Vercel), or running both locally for the demo?
3. **Demo data**: Should I generate seed data for the dashboard to show patterns, or will you supply real/realistic visit data?
4. **Auth scope**: The context lists auth as a stretch goal. Should I scaffold Supabase Auth from Phase 0 (just the wiring, no role-based UI) or skip it entirely until Phase 9?

---

## Project Structure

```
Debrief/
├── Context.md
├── backend/                         # FastAPI service
│   ├── .env
│   ├── pyproject.toml
│   ├── main.py                      # FastAPI app entry point
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                # Settings / env loading
│   │   ├── database.py              # Supabase client init
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── visit.py             # Pydantic schemas for visits
│   │   │   ├── media.py             # Pydantic schemas for media_items
│   │   │   └── debrief.py           # Pydantic schemas for debrief_summaries
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── visits.py            # CRUD endpoints for visits
│   │   │   ├── media.py             # Upload + processing endpoints
│   │   │   ├── debriefs.py          # Debrief generation + retrieval
│   │   │   └── dashboard.py         # Aggregation / pattern endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── transcription.py     # ElevenLabs Scribe wrapper
│   │   │   ├── vision.py            # Claude vision (photo caption, OCR)
│   │   │   ├── debrief_chain.py     # LangChain debrief generation
│   │   │   └── patterns.py          # Aggregation / pattern logic
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── storage.py           # Supabase Storage helpers
│   └── migrations/
│       └── 001_initial_schema.sql   # SQL migration for all tables
│
└── frontend/                        # Next.js app
    ├── package.json
    ├── next.config.js
    ├── public/
    │   ├── manifest.json            # PWA manifest
    │   ├── sw.js                    # Service worker (Phase 8)
    │   └── icons/                   # PWA icons
    ├── src/
    │   ├── app/
    │   │   ├── layout.js            # Root layout (fonts, global styles)
    │   │   ├── page.js              # Home / landing → redirect to /log
    │   │   ├── globals.css          # Global styles + design tokens
    │   │   ├── log/
    │   │   │   └── page.js          # Visit logging form
    │   │   ├── debrief/
    │   │   │   └── [id]/
    │   │   │       └── page.js      # Single debrief view
    │   │   ├── dashboard/
    │   │   │   └── page.js          # Manager dashboard (list + filters)
    │   │   ├── map/
    │   │   │   └── page.js          # Map view
    │   │   └── patterns/
    │   │       └── page.js          # Pattern surfacing view
    │   ├── components/
    │   │   ├── ui/                   # Reusable primitives
    │   │   │   ├── Button.js
    │   │   │   ├── Input.js
    │   │   │   ├── Select.js
    │   │   │   ├── Card.js
    │   │   │   ├── Badge.js
    │   │   │   ├── Spinner.js
    │   │   │   └── Modal.js
    │   │   ├── layout/
    │   │   │   ├── MobileNav.js      # Bottom tab navigation
    │   │   │   └── Header.js
    │   │   ├── visit/
    │   │   │   ├── VisitForm.js      # Main logging form
    │   │   │   ├── LocationPicker.js # Geolocation + manual fallback
    │   │   │   ├── PillarsChecklist.js
    │   │   │   ├── StakeholderTags.js
    │   │   │   └── MediaUploader.js  # Multi-media capture/upload
    │   │   ├── debrief/
    │   │   │   ├── DebriefCard.js    # Summary card
    │   │   │   ├── BlockerList.js
    │   │   │   ├── SentimentBadge.js
    │   │   │   └── FollowUpList.js
    │   │   ├── dashboard/
    │   │   │   ├── FilterBar.js
    │   │   │   ├── DebriefTable.js
    │   │   │   └── StatsRow.js
    │   │   ├── map/
    │   │   │   ├── VisitMap.js
    │   │   │   └── VisitPopup.js
    │   │   └── patterns/
    │   │       ├── BlockerHeatmap.js
    │   │       ├── SentimentTrend.js
    │   │       └── SynthesisPanel.js
    │   └── lib/
    │       ├── api.js                # Fetch wrapper for FastAPI
    │       ├── supabase.js           # Supabase client (browser)
    │       ├── constants.js          # Dropdown options, program areas, etc.
    │       └── utils.js              # Formatters, helpers
    └── tailwind.config.js            # (only if you choose Tailwind)
```

---

## Phase 0 — Project Setup & Database Schema

**Goal:** Wire up both services, create the database schema, confirm a trivial round-trip.

---

### Backend (FastAPI + Supabase)

#### [MODIFY] [pyproject.toml](file:///c:/Users/Musharraf/Documents/Debrief/backend/pyproject.toml)
Add all required dependencies:
```toml
dependencies = [
    "fastapi[standard]>=0.115",
    "uvicorn[standard]>=0.30",
    "supabase>=2.0",
    "python-dotenv>=1.0",
    "python-multipart>=0.0.9",
    "anthropic>=0.30",
    "langchain>=0.2",
    "langchain-anthropic>=0.1",
    "httpx>=0.27",
    "pydantic>=2.0",
]
```

#### [MODIFY] [main.py](file:///c:/Users/Musharraf/Documents/Debrief/backend/main.py)
Replace with FastAPI app initialization:
- Create `FastAPI()` instance with CORS middleware (allow `http://localhost:3000`)
- Import and include routers (visits, media, debriefs, dashboard)
- Add a health-check `GET /` endpoint

#### [NEW] `app/config.py`
- Use `pydantic-settings` or `python-dotenv` to load:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`
  - `FRONTEND_URL` (for CORS)

#### [NEW] `app/database.py`
- Initialize the Supabase client using `supabase.create_client(url, key)`
- Export a `get_supabase()` function for dependency injection

#### [MODIFY] `.env`
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=xi-...
FRONTEND_URL=http://localhost:3000
```

#### [NEW] `migrations/001_initial_schema.sql`

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- VISITS
-- ============================================================
CREATE TABLE visits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Who & when
    visitor_name    TEXT NOT NULL,
    visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Where (hierarchical text + live geotag)
    state           TEXT NOT NULL,
    district        TEXT NOT NULL,
    block           TEXT NOT NULL,
    village         TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,

    -- What
    program_area    TEXT NOT NULL,             -- e.g. "Livelihoods", "Health", "WASH"
    stakeholders    TEXT[] NOT NULL DEFAULT '{}', -- array of tags
    
    -- Four-pillars quick status (each: "on_track" | "at_risk" | "off_track" | "not_observed")
    pillar_governance   TEXT DEFAULT 'not_observed',
    pillar_financials   TEXT DEFAULT 'not_observed',
    pillar_activities   TEXT DEFAULT 'not_observed',
    pillar_outcomes     TEXT DEFAULT 'not_observed',

    -- Free-form
    notes           TEXT,

    -- Processing status
    debrief_status  TEXT NOT NULL DEFAULT 'pending'  -- pending | processing | completed | failed
);

-- ============================================================
-- MEDIA ITEMS
-- ============================================================
CREATE TABLE media_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    media_type      TEXT NOT NULL,             -- "photo" | "video" | "voice" | "handwritten"
    storage_path    TEXT NOT NULL,             -- path in Supabase Storage bucket
    original_name   TEXT,
    mime_type       TEXT,
    file_size_bytes BIGINT,

    -- AI-extracted content
    processing_status TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed
    extracted_text    TEXT,                    -- transcript / caption / OCR result
    processing_error  TEXT
);

-- ============================================================
-- DEBRIEF SUMMARIES
-- ============================================================
CREATE TABLE debrief_summaries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id        UUID NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- AI-generated structured output
    key_findings    JSONB NOT NULL DEFAULT '[]',   -- [{finding: "...", source: "notes|photo|voice|..."}]
    blockers        JSONB NOT NULL DEFAULT '[]',   -- [{description: "...", category: "...", severity: "high|medium|low"}]
    sentiment       TEXT,                          -- "positive" | "neutral" | "negative" | "mixed"
    sentiment_rationale TEXT,
    follow_ups      JSONB NOT NULL DEFAULT '[]',   -- [{action: "...", priority: "high|medium|low", assignee_hint: "..."}]

    -- Raw LLM output for debugging
    raw_llm_response TEXT,
    model_used       TEXT
);

-- ============================================================
-- INDEXES for dashboard queries
-- ============================================================
CREATE INDEX idx_visits_district ON visits(district);
CREATE INDEX idx_visits_program ON visits(program_area);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_status ON visits(debrief_status);
CREATE INDEX idx_media_visit ON media_items(visit_id);
CREATE INDEX idx_debrief_visit ON debrief_summaries(visit_id);
```

> Run this migration via the Supabase SQL Editor (Dashboard → SQL → New Query → Paste → Run).

#### [NEW] Supabase Storage Bucket
Create a storage bucket called `visit-media` in the Supabase dashboard (Storage → New Bucket). Set it to **private** (files accessed via signed URLs).

---

### Frontend (Next.js)

#### [NEW] `frontend/` — Initialize Next.js project
```bash
cd c:\Users\Musharraf\Documents\Debrief
npx -y create-next-app@latest frontend --js --app --no-tailwind --eslint --no-src-dir --import-alias "@/*"
```

> [!NOTE]
> We use `--no-tailwind` per the project brief's vanilla CSS preference. If you want Tailwind instead, say so and I'll adjust.

#### [NEW] `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
```

#### [NEW] `frontend/lib/api.js`
- Thin fetch wrapper around the FastAPI backend (`NEXT_PUBLIC_API_URL`)
- Methods: `get()`, `post()`, `postForm()` (for multipart uploads)
- Automatic JSON parsing, error handling

#### [NEW] `frontend/lib/supabase.js`
- Browser-side Supabase client for auth (stretch) and realtime (stretch)
- Uses `@supabase/supabase-js`

### Verification — Phase 0
- [ ] `uvicorn main:app --reload` starts on `:8000`, `GET /` returns `{"status": "ok"}`
- [ ] `npm run dev` starts Next.js on `:3000`
- [ ] Supabase tables visible in Table Editor
- [ ] Frontend can `fetch("http://localhost:8000/")` and log the response

---

## Phase 1 — Core Structured Visit Logging (No AI)

**Goal:** Build a fast, mobile-first visit form that saves to Supabase and reads back correctly.

---

### Backend

#### [NEW] `app/models/visit.py`
Pydantic schemas:
```python
class VisitCreate(BaseModel):
    visitor_name: str
    visit_date: date = Field(default_factory=date.today)
    state: str
    district: str
    block: str
    village: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    program_area: str
    stakeholders: list[str] = []
    pillar_governance: str = "not_observed"
    pillar_financials: str = "not_observed"
    pillar_activities: str = "not_observed"
    pillar_outcomes: str = "not_observed"
    notes: str | None = None

class VisitResponse(VisitCreate):
    id: UUID
    created_at: datetime
    debrief_status: str
```

#### [NEW] `app/routers/visits.py`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/visits` | Create a new visit |
| `GET` | `/api/visits` | List visits (with pagination, filters) |
| `GET` | `/api/visits/{id}` | Get a single visit by ID |

Implementation:
- Use Supabase Python client: `supabase.table("visits").insert(...)`, `.select(...)`, etc.
- `GET /api/visits` supports query params: `state`, `district`, `program_area`, `date_from`, `date_to`, `limit`, `offset`

---

### Frontend

#### [NEW] `app/globals.css` — Design System
Core CSS design tokens and utilities:
- **Colors:** Deep navy primary (`hsl(220, 60%, 15%)`), warm accent (`hsl(25, 95%, 55%)`), success/warning/danger semantic colors
- **Typography:** Google Font `Inter` via `next/font`
- **Spacing scale:** 4px base, `--space-1` through `--space-8`
- **Radius:** `--radius-sm` (6px), `--radius-md` (12px), `--radius-lg` (20px)
- **Shadows:** Layered soft shadows for depth
- **Animations:** `@keyframes fadeIn`, `slideUp`, `pulse`
- **Mobile-first breakpoints:** base → `min-width: 640px` → `min-width: 1024px`

#### [NEW] `components/ui/*` — Reusable Primitives
- `Button.js` — primary/secondary/ghost variants, loading state with spinner, size variants
- `Input.js` — label, error state, helper text, large touch targets (min 48px height)
- `Select.js` — styled dropdown, also 48px min height
- `Card.js` — glassmorphic card with subtle border + shadow
- `Badge.js` — colored status badges (on_track → green, at_risk → amber, off_track → red)
- `Spinner.js` — animated loading spinner

#### [NEW] `components/layout/MobileNav.js`
Bottom tab bar with 4 tabs: **Log** · **Dashboard** · **Map** · **Patterns**
- Fixed to bottom, 56px tall, icon + label per tab
- Active tab highlighted with accent color + subtle scale animation

#### [NEW] `components/layout/Header.js`
- App title "Debrief" with a subtle gradient
- Minimal, stays out of the way on mobile

#### [NEW] `components/visit/VisitForm.js`
The main logging form — this is the **most critical UX surface**:
- **Stepper layout** on mobile: 3 steps to keep each screen short
  1. **Who & Where** — visitor name (remembered from last use), location cascade (state → district → block → village), geolocation button (auto-fills lat/lng)
  2. **What** — program area (big tap cards, not a dropdown), stakeholders (tag picker), four-pillars status (tap-to-toggle cards: ✅ on track / ⚠️ at risk / ❌ off track / ➖ not observed)
  3. **Notes & Media** — free-form text area, media uploader (Phase 2+)
- **Progress indicator** at the top (step dots)
- **Submit button** with loading state, success animation (checkmark)
- Remembers `visitor_name`, `state`, `district` in `localStorage` for repeat use

#### [NEW] `components/visit/LocationPicker.js`
- "Use my location" button → calls `navigator.geolocation.getCurrentPosition()`
- Shows lat/lng as a subtle chip below the button
- Falls back to manual entry if geolocation fails

#### [NEW] `components/visit/PillarsChecklist.js`
- 4 cards in a 2×2 grid, each representing one pillar
- Tap cycles through: not observed → on track → at risk → off track
- Color-coded per status with smooth transitions

#### [NEW] `components/visit/StakeholderTags.js`
- Pre-defined tags: "Didi", "SHG members", "VO/CLF leaders", "PRI members", "Govt. officials", "Program staff"
- Tap to toggle, multi-select
- Option to type a custom stakeholder

#### [NEW] `app/log/page.js`
- Renders `<VisitForm />`
- On submit: `POST /api/visits` → show success toast → (later, redirect to debrief view)

### Verification — Phase 1
- [ ] Fill out the form on a mobile viewport (Chrome DevTools → 375px wide)
- [ ] Submit → visit appears in Supabase Table Editor
- [ ] Reload the page → geolocation still works
- [ ] `GET /api/visits` returns the submitted visit
- [ ] Form feels fast: no more than 3 taps + minimal typing for a basic visit

---

## Phase 2 — First AI Path: Voice Memo Recording & Transcription

**Goal:** Get one complete media type (voice memo) working end-to-end: record → upload → transcribe → store.

---

### Backend

#### [NEW] `app/utils/storage.py`
- `upload_file(bucket, file, path)` → Supabase Storage upload
- `get_signed_url(bucket, path, expires)` → signed download URL
- `delete_file(bucket, path)`

#### [NEW] `app/services/transcription.py`
- `transcribe_audio(file_bytes, mime_type) -> str`
- Calls ElevenLabs Scribe v2 API:
  ```
  POST https://api.elevenlabs.io/v1/speech-to-text
  Headers: xi-api-key: {key}
  Body (multipart): file, model_id="scribe_v1"
  ```
- Returns the transcript text
- Handles errors (file too large, unsupported format, API failure)

#### [NEW] `app/models/media.py`
```python
class MediaItemResponse(BaseModel):
    id: UUID
    visit_id: UUID
    media_type: str        # "voice"
    storage_path: str
    processing_status: str # "pending" | "processing" | "completed" | "failed"
    extracted_text: str | None
```

#### [NEW] `app/routers/media.py`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/visits/{visit_id}/media` | Upload a media file (multipart form) |
| `GET` | `/api/visits/{visit_id}/media` | List all media for a visit |
| `GET` | `/api/media/{id}` | Get single media item (with signed URL) |

**Upload flow:**
1. Receive file via `UploadFile`
2. Upload to Supabase Storage → `visit-media/{visit_id}/{uuid}.{ext}`
3. Insert row into `media_items` with `processing_status = "pending"`
4. **Synchronous processing** (for the prototype — async/background would be stretch):
   - If `media_type == "voice"`: call `transcribe_audio()`, save `extracted_text`, set status to `completed`
5. Return the `MediaItemResponse`

---

### Frontend

#### [NEW] `components/visit/MediaUploader.js`
The media capture hub — appears in Step 3 of the visit form:
- **Voice memo button**: 
  - Tap-and-hold or toggle-to-record using `MediaRecorder` API
  - Shows a pulsing red dot and elapsed time while recording
  - On stop: saves as `.webm`, shows a playback chip with waveform preview
- **Attached files list**: shows each uploaded file with status (uploading → processing → done)
- *Photo, video, handwritten note buttons present but disabled until Phase 4*

#### Update `components/visit/VisitForm.js`
- After visit is submitted (`POST /api/visits`), if there are media files:
  - Upload each via `POST /api/visits/{id}/media`
  - Show progress per file
  - Wait for all uploads to complete before navigating away

### Verification — Phase 2
- [ ] Record a 15-second voice memo on mobile
- [ ] Submit the visit → file appears in Supabase Storage bucket
- [ ] `media_items` row has `processing_status = "completed"` and `extracted_text` populated
- [ ] Playback works from the visit detail view

---

## Phase 3 — AI Debrief Summary Generation

**Goal:** Combine structured fields + notes + transcript into one Claude call that produces a useful, structured debrief. This is the moment the AI layer proves its value.

---

### Backend

#### [NEW] `app/services/debrief_chain.py`
LangChain chain that generates the structured debrief:

**Input assembly:**
```
Structured context:
- Visit date: {visit_date}
- Location: {village}, {block}, {district}, {state}
- Program area: {program_area}
- Stakeholders met: {stakeholders}
- Four pillars status: Governance={pillar_governance}, Financials={pillar_financials}, ...
- Free-form notes: {notes}

Attached media transcripts/captions:
- [Voice memo 1]: {extracted_text}
- [Photo 1 caption]: {extracted_text}
...
```

**Prompt (system):**
```
You are an AI assistant for The/Nudge Institute's field debrief tool. Given a field visit's structured data and any attached media transcripts/captions, produce a JSON object with:

{
  "key_findings": [{"finding": "...", "source": "notes|voice|photo|handwritten|video"}],
  "blockers": [{"description": "...", "category": "infrastructure|governance|financial|capacity|coordination|access|other", "severity": "high|medium|low"}],
  "sentiment": "positive|neutral|negative|mixed",
  "sentiment_rationale": "...",
  "follow_ups": [{"action": "...", "priority": "high|medium|low", "assignee_hint": "..."}]
}

Rules:
- Pull findings directly from the provided data. Do NOT fabricate.
- Severity: high = blocks program delivery, medium = degrades quality, low = minor inconvenience.
- Sentiment reflects the overall community/program vibe observed.
- Follow-ups should be specific and actionable.
- If information is sparse, produce fewer items rather than padding.
```

- Uses `langchain_anthropic.ChatAnthropic` with `claude-sonnet-4-20250514`
- Parses output as JSON, validates against schema
- Stores in `debrief_summaries` table

#### [NEW] `app/models/debrief.py`
```python
class BlockerItem(BaseModel):
    description: str
    category: str
    severity: str  # high | medium | low

class FollowUpItem(BaseModel):
    action: str
    priority: str  # high | medium | low
    assignee_hint: str | None = None

class FindingItem(BaseModel):
    finding: str
    source: str

class DebriefResponse(BaseModel):
    id: UUID
    visit_id: UUID
    key_findings: list[FindingItem]
    blockers: list[BlockerItem]
    sentiment: str
    sentiment_rationale: str
    follow_ups: list[FollowUpItem]
    created_at: datetime
```

#### [NEW] `app/routers/debriefs.py`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/visits/{visit_id}/debrief` | Generate debrief for a visit |
| `GET` | `/api/visits/{visit_id}/debrief` | Get existing debrief |

**Generation flow:**
1. Fetch the visit + all its media_items (where `processing_status = "completed"`)
2. Assemble the prompt context
3. Call the LangChain chain
4. Parse + validate the JSON response
5. Insert into `debrief_summaries`
6. Update `visits.debrief_status = "completed"`
7. Return the `DebriefResponse`

---

### Frontend

#### [NEW] `app/debrief/[id]/page.js`
Single debrief view, displayed right after visit submission:
- **Header**: visit date, location, visitor name
- **Key Findings** section: bullet list with source icons (🎤 voice, 📷 photo, 📝 notes)
- **Blockers** section: cards with category badge + severity badge (color-coded)
- **Sentiment** section: large emoji + label + rationale text
- **Follow-ups** section: checklist-style list with priority badges
- **Original media** section: collapsible, shows playback/preview of attached files

#### [NEW] `components/debrief/DebriefCard.js`
Compact card for use in lists (dashboard). Shows: date, location, sentiment badge, blocker count, first finding.

#### [NEW] `components/debrief/BlockerList.js`
Renders blocker items with category icon, severity color, description.

#### [NEW] `components/debrief/SentimentBadge.js`
Colored badge: 🟢 positive, 🟡 neutral, 🔴 negative, 🟠 mixed.

#### [NEW] `components/debrief/FollowUpList.js`
Renders follow-up actions with priority badges.

#### Update `components/visit/VisitForm.js`
After all media uploads complete:
1. Call `POST /api/visits/{id}/debrief`
2. Show a "Generating debrief..." loading state (animated sparkle ✨)
3. On success: navigate to `/debrief/{id}`

### Verification — Phase 3
- [ ] Submit a visit with notes + voice memo → debrief is generated
- [ ] Debrief view shows key findings, blockers, sentiment, follow-ups
- [ ] Blockers have reasonable categories and severities
- [ ] Sentiment matches the tone of the notes
- [ ] `debrief_summaries` row exists in Supabase with valid JSON

---

## Phase 4 — Remaining Media Types

**Goal:** Add photo captioning, handwritten note OCR, and video transcription. Extend the debrief chain to incorporate all media.

---

### Backend

#### [NEW] `app/services/vision.py`
Claude vision processing:
- `caption_photo(image_bytes) -> str`: Send image to Claude with prompt "Describe what you see in this field visit photo. Focus on infrastructure condition, group activities, and environmental context."
- `ocr_handwritten(image_bytes) -> str`: Send image to Claude with prompt "This is a photographed handwritten field note. Extract and transcribe all the text as accurately as possible."
- Uses `anthropic.Client` directly (base64 image in the message)

#### Update `app/services/transcription.py`
- Add `transcribe_video(file_bytes, mime_type) -> str`
- ElevenLabs Scribe v2 accepts video files directly — same API, just pass the video

#### Update `app/routers/media.py`
Extend upload processing logic:
```python
if media_type == "voice":
    text = transcribe_audio(file_bytes)
elif media_type == "video":
    text = transcribe_video(file_bytes)
elif media_type == "photo":
    text = caption_photo(file_bytes)
elif media_type == "handwritten":
    text = ocr_handwritten(file_bytes)
```

#### Update `app/services/debrief_chain.py`
- The chain already handles multiple media items — no logic change needed
- Just ensure the prompt assembler iterates all `media_items` regardless of type

---

### Frontend

#### Update `components/visit/MediaUploader.js`
Enable the remaining buttons:
- **📷 Photo**: Opens camera (`accept="image/*"` + `capture="environment"`) or file picker
  - Shows thumbnail preview after capture
- **📝 Handwritten note**: Same camera flow, but labels as "handwritten" type
  - Could add a subtle tip: "Photograph your handwritten notes for automatic transcription"
- **🎥 Video**: Opens video capture (`accept="video/*"` + `capture="environment"`) or file picker
  - Shows video thumbnail + duration

Each button follows the same upload flow: capture → preview → upload on form submit.

### Verification — Phase 4
- [ ] Upload a photo → `extracted_text` contains a relevant caption
- [ ] Upload a handwritten note → `extracted_text` contains the OCR'd text
- [ ] Upload a video → `extracted_text` contains the transcription
- [ ] Submit a visit with mixed media (voice + photo + notes) → debrief incorporates all sources
- [ ] Media previews render correctly on mobile

---

## Phase 5 — Manager Dashboard (List View)

**Goal:** Filterable table of all debriefs. Click into any visit to see the full debrief.

---

### Backend

#### [NEW] `app/routers/dashboard.py`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/debriefs` | Paginated list of visits+debriefs with filters |
| `GET` | `/api/dashboard/stats` | Summary stats (total visits, blocker count, sentiment distribution) |

**`GET /api/dashboard/debriefs`** query params:
- `state`, `district`, `block` — geography filters
- `program_area` — program filter
- `date_from`, `date_to` — date range
- `sentiment` — sentiment filter
- `blocker_category` — filter visits that have blockers of this category
- `search` — text search across notes and findings
- `sort_by` — `visit_date` | `created_at` (default: `visit_date` desc)
- `limit`, `offset` — pagination

Response: join `visits` + `debrief_summaries`, return combined objects.

**`GET /api/dashboard/stats`** (same filters):
```json
{
  "total_visits": 47,
  "visits_with_blockers": 23,
  "sentiment_distribution": {"positive": 12, "neutral": 18, "negative": 10, "mixed": 7},
  "top_blocker_categories": [{"category": "infrastructure", "count": 15}, ...],
  "recent_visits_per_day": [{"date": "2026-06-18", "count": 5}, ...]
}
```

---

### Frontend

#### [NEW] `app/dashboard/page.js`
Desktop-friendly (but still responsive) dashboard layout:
- **Stats row** at top: 4 metric cards (total visits, blockers, avg sentiment, visits this week)
- **Filter bar** below stats
- **Debrief table** as main content
- Click any row → navigate to `/debrief/{id}`

#### [NEW] `components/dashboard/StatsRow.js`
4 glassmorphic stat cards with icons and animated counters:
- 📊 Total Visits
- 🚫 Visits with Blockers  
- 😊 Sentiment Breakdown (mini donut or bar)
- 📅 Visits This Week

#### [NEW] `components/dashboard/FilterBar.js`
Horizontal filter bar (scrollable on mobile):
- Dropdowns: State, District, Program Area, Sentiment
- Date range picker (from/to)
- "Clear filters" button
- Filters update URL query params for shareability

#### [NEW] `components/dashboard/DebriefTable.js`
Responsive table / card list:
- **Desktop (≥1024px)**: Standard table with columns: Date, Location, Program, Sentiment, Blockers, Key Finding
- **Mobile (<1024px)**: Stacked cards (one per visit) with the same info
- Pagination controls at bottom
- Empty state with illustration when no results

### Verification — Phase 5
- [ ] Dashboard loads and shows all submitted visits
- [ ] Filters work correctly (selecting "infrastructure" blocker shows only matching visits)
- [ ] Clicking a row opens the full debrief view
- [ ] Stats update when filters change
- [ ] Responsive: table on desktop, cards on mobile

---

## Phase 6 — Map View

**Goal:** Plot visit pins on a map, color-coded by sentiment or blocker presence.

---

### Backend
No new endpoints needed — the `GET /api/dashboard/debriefs` endpoint already returns `latitude`/`longitude` with each visit. Add a `format=geo` query param that returns GeoJSON for the map:

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {"type": "Point", "coordinates": [lng, lat]},
    "properties": {
      "id": "...",
      "visit_date": "2026-06-18",
      "location_label": "Darbhanga, Bihar",
      "sentiment": "negative",
      "blocker_count": 2,
      "first_finding": "..."
    }
  }]
}
```

---

### Frontend

#### Install map library
```bash
npm install mapbox-gl    # if using Mapbox
# OR
npm install leaflet react-leaflet   # if using Leaflet (free)
```

#### [NEW] `app/map/page.js`
- Full-screen map with filter sidebar (collapsible on mobile)
- Same filter options as dashboard

#### [NEW] `components/map/VisitMap.js`
- Renders the map with visit pins
- **Pin color** based on toggle: sentiment (🟢🟡🔴) or blocker presence (🔴 has blockers, 🟢 no blockers)
- **Clustering** for dense areas (show count badge)
- **Toggle control**: "Color by: Sentiment | Blockers"

#### [NEW] `components/map/VisitPopup.js`
Popup on pin click showing:
- Location, date, visitor
- Sentiment badge
- First key finding (truncated)
- Blocker count
- "View full debrief →" link

### Verification — Phase 6
- [ ] Map renders with pins at correct locations
- [ ] Color coding reflects sentiment/blocker status
- [ ] Clusters appear when zoomed out
- [ ] Clicking a pin shows the popup with correct data
- [ ] "View full debrief" link works
- [ ] Map is usable on mobile (pinch to zoom, tap pins)

---

## Phase 7 — Pattern Surfacing

**Goal:** Aggregate blockers by geography/program, show sentiment trends, and optionally generate AI synthesis narratives.

---

### Backend

#### [NEW] `app/services/patterns.py`
Aggregation logic:
- `get_blocker_patterns(filters) -> list[BlockerPattern]`: GROUP BY `district` + `blocker.category`, count occurrences
- `get_sentiment_trends(filters) -> list[SentimentTrendPoint]`: GROUP BY week + geography, average sentiment score
- `get_synthesis(filters) -> str` (stretch): Fetch recent debriefs for a geography/program, send to Claude with a synthesis prompt

#### Update `app/routers/dashboard.py`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/patterns/blockers` | Blocker frequency by geography × category |
| `GET` | `/api/dashboard/patterns/sentiment` | Sentiment trend over time |
| `POST` | `/api/dashboard/patterns/synthesize` | (Stretch) AI narrative synthesis |

**`GET /api/dashboard/patterns/blockers`** response:
```json
[
  {"district": "Darbhanga", "category": "infrastructure", "count": 8, "latest_date": "2026-06-18"},
  {"district": "Muzaffarpur", "category": "governance", "count": 5, "latest_date": "2026-06-15"}
]
```

**`GET /api/dashboard/patterns/sentiment`** response:
```json
[
  {"week": "2026-W24", "district": "Darbhanga", "avg_sentiment_score": -0.4, "visit_count": 6},
  {"week": "2026-W23", "district": "Darbhanga", "avg_sentiment_score": 0.1, "visit_count": 4}
]
```
(Map sentiment to numeric: positive=1, neutral=0, negative=-1, mixed=-0.5)

---

### Frontend

#### [NEW] `app/patterns/page.js`
Pattern surfacing page:
- **Section 1: Recurring Blockers** — heatmap-style table or bar chart
- **Section 2: Sentiment Trends** — line chart over time
- **Section 3: AI Synthesis** (stretch) — select geography + program → generate narrative

#### [NEW] `components/patterns/BlockerHeatmap.js`
- Rows = districts/blocks, Columns = blocker categories
- Cell color intensity = frequency (white → amber → red)
- Click a cell → filter dashboard to those visits
- Built with CSS Grid + dynamic background colors (no charting library needed)

#### [NEW] `components/patterns/SentimentTrend.js`
- Simple line chart: X = weeks, Y = average sentiment score
- One line per selected district (max 5, color-coded)
- Built with `<canvas>` or a lightweight chart library (Chart.js)
- Tooltip on hover showing exact values

#### [NEW] `components/patterns/SynthesisPanel.js` (stretch)
- Dropdown: select geography + program area
- "Generate synthesis" button
- Shows a loading state, then renders the AI-generated narrative
- Narrative is styled as a clean, readable card with highlighted patterns

### Verification — Phase 7
- [ ] Blocker heatmap shows correct counts (cross-reference with raw data)
- [ ] Sentiment trend lines track correctly over time
- [ ] Clicking a heatmap cell navigates to filtered dashboard view
- [ ] (Stretch) Synthesis generates a coherent narrative from recent debriefs

---

## Phase 8 — Polish & PWA

**Goal:** Make it feel production-grade. PWA installable. Great empty/loading/error states. Mobile UX pass.

---

### Frontend

#### [NEW] `public/manifest.json`
```json
{
  "name": "Debrief — Field Visit Intelligence",
  "short_name": "Debrief",
  "start_url": "/log",
  "display": "standalone",
  "background_color": "#0f1729",
  "theme_color": "#e8722a",
  "icons": [
    {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

#### [MODIFY] `next.config.js`
Add PWA headers and `<link rel="manifest">`.

#### UX Polish Checklist
- [ ] **Loading states**: Skeleton loaders for dashboard/map, shimmer effect on cards
- [ ] **Empty states**: Friendly illustrations + CTAs ("No visits yet. Log your first visit →")
- [ ] **Error states**: Retry buttons, clear error messages, fallback UI
- [ ] **Toasts/notifications**: Success on submit, error on failure (subtle, non-blocking)
- [ ] **Tap targets**: All interactive elements ≥ 48×48px
- [ ] **One-handed use**: Important actions reachable from bottom of screen
- [ ] **Form persistence**: If the app is backgrounded mid-form, restore state from `sessionStorage`
- [ ] **Smooth transitions**: Page transitions (fade), card hover effects, list item appear animations
- [ ] **Favicon + meta tags**: Open Graph, description, theme-color

#### Seed Demo Data
Create a script `backend/scripts/seed_data.py` that:
- Generates 30-50 realistic visits across 3 states, 6 districts, multiple blocks
- Variety of program areas, stakeholders, pillar statuses
- Generates corresponding debrief summaries with realistic blockers and sentiments
- Ensures enough data for the dashboard and patterns to show meaningful results

### Verification — Phase 8
- [ ] App is installable as PWA on Android Chrome
- [ ] Loading/empty/error states all render correctly
- [ ] No broken layouts at any viewport size
- [ ] Dashboard with seed data shows real patterns in the heatmap
- [ ] Full user flow on mobile feels smooth: log → debrief → dashboard → map → patterns

---

## Phase 9 — Stretch Goals (If Time Allows)

**Goal:** Auth, offline support, export.

### 9a. Auth & Roles
- Wire Supabase Auth (email/password or magic link)
- Add `user_id` to `visits` table
- Two roles: `field_staff` (sees Log + own debriefs) and `manager` (sees Dashboard + Map + Patterns)
- Protect routes with Next.js middleware
- Protect API endpoints with Supabase JWT validation

### 9b. Offline-First Save
- Service worker caches the visit form page
- If offline: save visit to `IndexedDB` with a "pending" flag
- When back online: sync pending visits, show a "⏳ Pending sync" indicator
- Media files queued for upload once connectivity returns

### 9c. Export
- `GET /api/dashboard/export?format=csv` — CSV download of filtered debriefs
- `GET /api/dashboard/export?format=pdf` — PDF report with charts (using `reportlab` or `weasyprint`)
- Dashboard UI: "Export" button in the filter bar

---

## Verification Plan

### Automated Tests
```bash
# Backend — run from /backend
pytest tests/ -v

# Frontend — run from /frontend
npm test
```

Key tests:
- **Backend**: Visit CRUD, media upload + processing, debrief generation (mock LLM), dashboard aggregation queries
- **Frontend**: Form validation, component rendering, API integration (mock responses)

### Manual Verification
- Complete end-to-end flow on a real phone (or Chrome DevTools mobile viewport)
- Log a visit with voice + photo → verify debrief quality
- Check dashboard with 20+ visits → verify patterns are visible
- Test on slow connection (Chrome DevTools → Slow 3G throttle)

### Demo Checklist
- [ ] Log a visit in < 60 seconds on mobile
- [ ] Debrief auto-generates with useful, non-generic content
- [ ] Dashboard filters work and stats update
- [ ] Map shows pins with correct color coding
- [ ] Pattern view reveals a recurring blocker that's not obvious from individual visits
- [ ] App is installable as PWA

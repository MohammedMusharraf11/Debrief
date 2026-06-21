# Field Visit Debrief Tool — Project Brief & Build Plan

The/Nudge Institute · AI Product Engineer Intern Assignment (Option C)

---

## What We're Building

A mobile-first field intelligence tool that lets field staff (Block Leads, Program Associates, Community Cadre) log observations from field visits in seconds rather than minutes, structured metadata plus free-form notes, photos, video, voice memos, and photographed handwritten notes, and have AI turn that raw, messy input into a clean structured debrief (key findings, blockers, sentiment, follow-ups) automatically. A manager dashboard then aggregates debriefs across visits to surface patterns (recurring blockers by geography or program) that would otherwise stay buried in individual notebooks, WhatsApp threads, or paper logs.

The core bet: field knowledge is being captured today, it's just not being captured in a form anyone can query or learn from at scale. This tool closes that gap without adding friction to the person actually standing in a village.

---

## Stakeholders

- **Field Associates / Block Leads / Community Cadre** — the primary users who log visits. For them, the tool must be fast and low-effort, used standing in a field, often with patchy connectivity.
- **District Leads / State Leads / Program Managers** — the primary consumers of the dashboard. They need to see patterns across many visits, not read each one individually.
- **Program participants ("Didis"), SHGs/VOs/CLFs, government line department staff** — indirectly represented in the data (who's being visited, what's being observed), not direct tool users.
- **The/Nudge leadership / Strategy & Operations** — secondary consumers who'd use aggregated insights for higher-level decisions or government convergence conversations.

---

## Problem It Solves

- Field observations currently live in individual notebooks, scattered WhatsApp messages, or paper logs, none of which are searchable or aggregatable.
- Writing a structured debrief after a visit is manual and time-consuming, so it happens inconsistently or gets delayed/skipped.
- Recurring issues (e.g., a scheme convergence delay or seasonal access problem hitting one district repeatedly) stay invisible until they're a crisis, because no one is aggregating across visits.
- Capturing a photo, voice note, or scribbled note in the field is easy; turning that into usable structured information is the hard part, and today that translation doesn't happen at all.

---

## Features

### Must-have (core prototype)
- Mobile-responsive (PWA) visit logging form: date, visitor, location (state/district/block/village + live geotag), program area, stakeholders met, quick four-pillars status check
- Free-form notes plus multi-media capture: photo, video, voice memo, photographed handwritten note
- Per-media AI processing: voice/video transcription, photo captioning, handwritten note OCR
- AI-generated structured debrief per visit: key findings, blockers (categorized + severity), community sentiment with rationale, suggested follow-ups
- Manager dashboard: filterable list/table of all debriefs (by geography, program, date, blocker type)
- Map view: visit pins, color-coded by sentiment or blocker presence
- Pattern surfacing: recurring blockers grouped by geography/program, sentiment trend over time

### Nice-to-have (if time allows)
- On-demand AI "synthesis" narrative summarizing patterns across a batch of debriefs for a chosen geography/program
- Speaker diarization on voice memos
- Auth and role-based access (field staff vs. manager view)
- Offline-first save with a "pending sync" indicator
- Export dashboard view to PDF/Excel for leadership reporting

### Out of scope (for this prototype)
- True spatial polygon/geofencing queries (PostGIS district boundaries) — pattern aggregation uses the district/block text field instead, which gets the same insight without needing boundary shapefiles
- Production-grade offline sync / conflict resolution
- Multi-tenant support beyond a single org
- Full notification system

---

## What Matters for Evaluation

Straight from the assignment brief: *"a working prototype that makes logging frictionless (mobile-first thinking) and surfaces patterns that would otherwise stay in individual notebooks."* Breaking that down into what to actually optimize for:

1. **Frictionless logging** — does filling the form on a phone feel fast? Minimal typing, sensible defaults, quick taps over free text where possible, short time-to-submit.
2. **Genuinely mobile-first** — usable one-handed on a phone screen, not a shrunk-down desktop layout.
3. **AI layer quality** — is the generated debrief actually useful and accurate, correctly pulling blockers/sentiment out of messy notes and media, not generic boilerplate.
4. **Pattern surfacing that adds value** — does the dashboard reveal something a manager genuinely couldn't see by reading 20 individual notebooks? This is the single biggest differentiator.
5. **A working end-to-end demo** — a smaller scope that's fully wired and demoable beats a bigger architecture that's half-built. Prioritize one complete path over many incomplete ones.

---

## Tech Stack

- **Frontend:** Next.js (PWA), mobile-first responsive UI
- **AI orchestration backend:** FastAPI + LangChain
- **Database / storage / auth:** Supabase (Postgres + Storage + Auth)
- **Voice & video transcription:** ElevenLabs Scribe v2 (accepts audio and video files directly)
- **Vision & summarization:** Claude API (vision for photos/handwritten notes, text generation for the final structured debrief)
- **Map:** Mapbox GL JS or Leaflet

## Data Model (summary)

- `visits` — metadata, geotag (lat/lng), program area, stakeholders met, four-pillars status, free-text notes
- `media_items` — one row per upload (photo / video / voice / handwritten note), storage path, processing status, extracted text (transcript/caption/OCR)
- `debrief_summaries` — key findings, blockers (category + severity), sentiment + rationale, follow-ups, linked one-to-one with a visit

---

## Build Plan — Phase by Phase

### Phase 0 — Setup
Init the Next.js app, FastAPI service, and Supabase project. Create migrations for `visits`, `media_items`, `debrief_summaries`. Set up env vars/API keys (Supabase, Anthropic, ElevenLabs). Confirm each piece is wired with a trivial end-to-end "hello world."

### Phase 1 — Core structured logging (no AI yet)
Build the mobile-responsive visit form: metadata fields, live geolocation capture, stakeholders, pillars status, free-text notes. Save to Supabase and confirm a visit round-trips (write, then read back). Goal: a clean, fast logging flow with zero AI dependency yet.

### Phase 2 — First full AI path (voice memo only)
Add voice memo recording/upload. Wire a FastAPI endpoint: receive audio → ElevenLabs Scribe → transcript → store in `media_items`. Goal: get one complete media type fully working end-to-end before expanding to others.

### Phase 3 — Debrief summary generation
Build the LangChain chain that combines structured fields + free text + transcript into one Claude call producing structured output (findings, blockers, sentiment, follow-ups). Store in `debrief_summaries` and show it back to the user right after submission, this is the moment that proves the AI layer is actually useful.

### Phase 4 — Remaining media types
Add photo upload (vision captioning), handwritten note upload (vision OCR), and video upload (ElevenLabs Scribe, direct video input). Extend the summary chain to incorporate whatever media is present for a visit.

### Phase 5 — Manager dashboard (list view)
Filterable table of all debriefs (geography, program, date range, blocker category). Click into a visit to see the full debrief plus original media.

### Phase 6 — Map view
Plot visit pins using stored lat/lng on Mapbox/Leaflet. Color-code by sentiment or blocker presence. Cluster dense areas, popup with a mini-summary on click.

### Phase 7 — Pattern surfacing
Aggregate blockers by district/block and program area (simple GROUP BY). Sentiment trend over time per geography/program. Stretch: an on-demand LLM synthesis call across recent debriefs for a chosen area, producing a narrative pattern summary.

### Phase 8 — Polish
PWA manifest and installability. Loading/empty/error states. A real mobile UX pass (large tap targets, one-handed use). Seed realistic demo data across a few geographies so the dashboard has actual patterns to show.

### Phase 9 — Stretch (only if time remains)
Auth and roles (field staff vs. manager). Offline-first save with a pending-sync indicator. Export the dashboard view to PDF/Excel.

---

*Build one phase at a time, and don't move to the next phase until the current one works end-to-end. A fully working Phase 5 beats a half-working Phase 9.*

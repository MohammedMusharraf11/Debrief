## Debrief Backend

FastAPI service for field visit logging, Supabase persistence/storage, ElevenLabs Scribe v2 media transcription, Groq/OpenAI-compatible AI debrief generation, and dashboard pattern APIs.

### Local Run

Install dependencies locally with `uv` when ready:

```powershell
uv sync
uv run uvicorn main:app --reload
```

### Render Deploy

Use:

```powershell
pip install uv && uv sync --frozen
uv run uvicorn main:app --host 0.0.0.0 --port $PORT
```

See `render.yaml` and `../DEPLOYMENT.md`.

Health check:

```powershell
curl http://localhost:8000/
```

### Environment

Required:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ELEVENLABS_API_KEY=...
FRONTEND_URL=http://localhost:3000
```

For Groq:

```env
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

For a free/OpenAI-compatible model provider instead:

```env
OPENAI_COMPATIBLE_BASE_URL=https://provider.example/v1
OPENAI_COMPATIBLE_API_KEY=...
AI_MODEL=provider/model-name
```

If no AI key is configured, debrief generation uses a local extractive fallback.

### Supabase Migration

Run `migrations/001_initial_schema.sql` in the Supabase SQL editor. It creates:

- `visits`
- `media_items`
- `debrief_summaries`
- dashboard indexes
- private `visit-media` storage bucket

### Core Endpoints

- `POST /api/visits`
- `GET /api/visits`
- `GET /api/visits/{visit_id}`
- `POST /api/visits/{visit_id}/media`
- `GET /api/visits/{visit_id}/media`
- `POST /api/visits/{visit_id}/debrief`
- `GET /api/visits/{visit_id}/debrief`
- `GET /api/dashboard/debriefs`
- `GET /api/dashboard/debriefs?format=geo`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/patterns/blockers`
- `GET /api/dashboard/patterns/sentiment`

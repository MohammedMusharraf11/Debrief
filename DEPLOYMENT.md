# Deployment

Recommended prototype split:

- Frontend: Vercel
- Backend: Render
- Database/storage: Supabase

## Current Repo Note

Right now `backend/` is its own Git repo, while `frontend/` is a sibling folder. For deployment you can either:

1. Push `backend/` and `frontend/` as two separate GitHub repos.
2. Reinitialize one repo at `Debrief/` and push both folders together.

The quickest path is two repos.

## Backend on Render

Use the `backend/` folder as the Render service root.

Render settings:

```text
Environment: Python
Build Command: pip install uv && uv sync --frozen
Start Command: uv run uvicorn main:app --host 0.0.0.0 --port $PORT
Health Check Path: /
```

Or use the blueprint in:

```text
backend/render.yaml
```

Set these Render environment variables:

```env
FRONTEND_URL=https://your-vercel-app.vercel.app
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=visit-media
ELEVENLABS_API_KEY=...
ELEVENLABS_STT_MODEL=scribe_v2
GROQ_API_KEY=...
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

After deploy, verify:

```text
https://your-render-service.onrender.com/
https://your-render-service.onrender.com/api/dashboard/stats
```

## Frontend on Vercel

Use `frontend/` as the Vercel project root.

This is important. If Vercel deploys the repository root, `/`, `/log`, and `/visit` can all return `404` because the Next.js app lives under `frontend/`.

In Vercel:

```text
Project Settings -> Build and Deployment -> Root Directory -> frontend
```

Do not use a root-level `vercel.json` that runs `cd frontend ...` when Root Directory is already set to `frontend`.

Vercel should auto-detect Next.js. Set:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
```

Then deploy. After Vercel gives you the production URL, go back to Render and set:

```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Redeploy/restart the Render backend so CORS allows the Vercel frontend.

## Supabase

You already ran the core migrations. Make sure these are also applied:

```text
backend/migrations/002_make_block_optional.sql
backend/migrations/003_add_postal_code.sql
```

The storage bucket should exist:

```text
visit-media
```

Private bucket is fine because the backend creates signed URLs.

## Deploy Order

1. Deploy backend to Render with temporary `FRONTEND_URL=http://localhost:3000`.
2. Copy the Render URL.
3. Deploy frontend to Vercel with `NEXT_PUBLIC_API_URL=<Render URL>`.
4. Copy the Vercel URL.
5. Update Render `FRONTEND_URL=<Vercel URL>`.
6. Restart/redeploy Render.
7. Test `/log`, `/dashboard`, `/map`, `/patterns`.

## Gotchas

- Render free services can sleep, so the first API call may be slow.
- `NEXT_PUBLIC_API_URL` is client-exposed and must be set before Vercel builds.
- Never put `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, or `ELEVENLABS_API_KEY` in Vercel frontend env vars.
- If CORS fails, check that Render `FRONTEND_URL` exactly matches the Vercel production URL.

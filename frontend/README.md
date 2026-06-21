## Debrief Frontend

Next.js app-router PWA with Tailwind CSS for the field visit debrief tool.

### Local Run

Install dependencies locally:

```powershell
npm install
npm run dev
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Vercel Deploy

Use `frontend/` as the Vercel project root and set:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
```

See `../DEPLOYMENT.md`.

### Screens

- `/log` mobile-first visit logging, geotag, media capture, upload, debrief generation
- `/debrief/[id]` structured debrief summary
- `/dashboard` filters, stats, responsive debrief list/table
- `/map` geotagged visit plot from backend GeoJSON
- `/patterns` blocker heatmap and sentiment trends

### PWA

The app includes:

- `app/manifest.js`
- `public/sw.js`
- `public/icons/icon.svg`

The service worker registers in production builds.

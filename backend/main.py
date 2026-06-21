from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import dashboard, debriefs, media, visits


settings = get_settings()

app = FastAPI(
    title="Debrief API",
    description="Field visit logging, media processing, debrief generation, and manager analytics.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(visits.router, prefix="/api", tags=["visits"])
app.include_router(media.router, prefix="/api", tags=["media"])
app.include_router(debriefs.router, prefix="/api", tags=["debriefs"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

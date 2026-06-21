import re
from uuid import uuid4

from fastapi import HTTPException
from supabase import Client

from app.config import get_settings


def build_storage_path(visit_id: str, filename: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip("-") or "upload.bin"
    return f"{visit_id}/{uuid4()}-{safe_name}"


def upload_bytes(supabase: Client, path: str, file_bytes: bytes, mime_type: str | None) -> None:
    bucket = get_settings().storage_bucket
    try:
        supabase.storage.from_(bucket).upload(
            path,
            file_bytes,
            {"content-type": mime_type or "application/octet-stream", "upsert": "true"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Supabase Storage upload failed: {exc}") from exc


def create_signed_url(supabase: Client, path: str, expires_in: int = 3600) -> str | None:
    bucket = get_settings().storage_bucket
    try:
        response = supabase.storage.from_(bucket).create_signed_url(path, expires_in)
        if isinstance(response, dict):
            return response.get("signedURL") or response.get("signedUrl") or response.get("signed_url")
    except Exception:
        return None
    return None

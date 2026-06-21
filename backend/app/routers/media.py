from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from supabase import Client

from app.config import get_settings
from app.database import first_row, get_supabase, response_data
from app.models.media import MediaItemResponse, MediaType
from app.services.transcription import transcribe_media
from app.services.vision import caption_photo, ocr_handwritten
from app.utils.storage import build_storage_path, create_signed_url, upload_bytes

router = APIRouter()


@router.post("/visits/{visit_id}/media", response_model=MediaItemResponse, status_code=201)
async def upload_media(
    visit_id: UUID,
    media_type: MediaType = Form(...),
    file: UploadFile = File(...),
    language_code: str | None = Form(default=None),
    supabase: Client = Depends(get_supabase),
):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds MAX_UPLOAD_BYTES.")

    visit_response = supabase.table("visits").select("id").eq("id", str(visit_id)).limit(1).execute()
    first_row(visit_response)

    storage_path = build_storage_path(str(visit_id), file.filename or "upload.bin")
    upload_bytes(supabase, storage_path, file_bytes, file.content_type)

    media_row = {
        "visit_id": str(visit_id),
        "media_type": media_type,
        "storage_path": storage_path,
        "original_name": file.filename,
        "mime_type": file.content_type,
        "file_size_bytes": len(file_bytes),
        "processing_status": "processing",
    }
    inserted = first_row(supabase.table("media_items").insert(media_row).execute())

    try:
        extracted_text = await process_media(media_type, file_bytes, file.filename or "upload.bin", file.content_type, language_code)
        updated = first_row(
            supabase.table("media_items")
            .update({"processing_status": "completed", "extracted_text": extracted_text, "processing_error": None})
            .eq("id", inserted["id"])
            .execute()
        )
    except Exception as exc:
        updated = first_row(
            supabase.table("media_items")
            .update({"processing_status": "failed", "processing_error": str(exc)})
            .eq("id", inserted["id"])
            .execute()
        )

    updated["signed_url"] = create_signed_url(supabase, storage_path)
    return updated


@router.get("/visits/{visit_id}/media", response_model=list[MediaItemResponse])
def list_media(visit_id: UUID, supabase: Client = Depends(get_supabase)):
    response = supabase.table("media_items").select("*").eq("visit_id", str(visit_id)).order("created_at").execute()
    items = response_data(response)
    for item in items:
        item["signed_url"] = create_signed_url(supabase, item["storage_path"])
    return items


async def process_media(
    media_type: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str | None,
    language_code: str | None,
) -> str:
    if media_type in {"voice", "video"}:
        return await transcribe_media(file_bytes, filename, mime_type, language_code)
    if media_type == "photo":
        return await caption_photo(file_bytes, mime_type)
    if media_type == "handwritten":
        return await ocr_handwritten(file_bytes, mime_type)
    raise HTTPException(status_code=400, detail=f"Unsupported media_type: {media_type}")

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


MediaType = Literal["photo", "video", "voice", "handwritten"]
ProcessingStatus = Literal["pending", "processing", "completed", "failed"]


class MediaItemResponse(BaseModel):
    id: UUID
    visit_id: UUID
    created_at: datetime
    media_type: MediaType
    storage_path: str
    original_name: str | None = None
    mime_type: str | None = None
    file_size_bytes: int | None = None
    processing_status: ProcessingStatus
    extracted_text: str | None = None
    processing_error: str | None = None
    signed_url: str | None = None

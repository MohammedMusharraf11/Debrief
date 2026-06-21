import httpx
from fastapi import HTTPException

from app.config import get_settings


async def transcribe_media(
    file_bytes: bytes,
    filename: str,
    mime_type: str | None,
    language_code: str | None = None,
) -> str:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY must be configured.")

    data: dict[str, str | bool] = {
        "model_id": settings.elevenlabs_stt_model,
        "timestamps_granularity": "none",
        "tag_audio_events": True,
        "no_verbatim": True,
    }
    if language_code:
        data["language_code"] = language_code

    files = {"file": (filename, file_bytes, mime_type or "application/octet-stream")}
    headers = {"xi-api-key": settings.elevenlabs_api_key}

    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers=headers,
            data=data,
            files=files,
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs transcription failed: {response.text[:500]}",
        )

    payload = response.json()
    if "text" in payload and payload["text"]:
        return payload["text"]
    if "transcripts" in payload:
        texts = [item.get("text", "") for item in payload["transcripts"] if item.get("text")]
        return "\n".join(texts)
    return ""

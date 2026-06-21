import base64

from app.services.llm_client import LLMUnavailable, chat_json
from app.config import get_settings


VISION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {"text": {"type": "string"}},
    "required": ["text"],
}


async def caption_photo(file_bytes: bytes, mime_type: str | None) -> str:
    prompt = (
        "Describe this field visit photo. Focus on infrastructure condition, group activities, "
        "visible documents/materials, environmental context, and anything relevant to a program debrief. "
        "Return concise factual text only."
    )
    return await _analyze_image(file_bytes, mime_type, prompt)


async def ocr_handwritten(file_bytes: bytes, mime_type: str | None) -> str:
    prompt = (
        "This is a photographed handwritten field note. Transcribe all readable text as accurately as possible. "
        "If parts are unclear, mark them as [unclear]. Return only the transcription."
    )
    return await _analyze_image(file_bytes, mime_type, prompt)


async def _analyze_image(file_bytes: bytes, mime_type: str | None, prompt: str) -> str:
    data_url = f"data:{mime_type or 'image/jpeg'};base64,{base64.b64encode(file_bytes).decode('ascii')}"
    content = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]
    try:
        result, _, _ = await chat_json(
            system="You are a careful field documentation assistant. Do not invent details.",
            user=content,
            schema=VISION_SCHEMA,
            model=get_settings().llm_vision_model,
            max_tokens=700,
        )
        return str(result.get("text", "")).strip()
    except LLMUnavailable:
        return "Image analysis skipped because no Groq/OpenAI-compatible AI key is configured."

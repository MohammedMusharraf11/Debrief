import json
from typing import Any

import httpx

from app.config import get_settings


class LLMUnavailable(RuntimeError):
    pass


async def chat_json(
    *,
    system: str,
    user: str | list[dict[str, Any]],
    schema: dict[str, Any] | None = None,
    model: str | None = None,
    max_tokens: int = 1800,
) -> tuple[dict[str, Any], str, str]:
    settings = get_settings()
    if not settings.llm_api_key:
        raise LLMUnavailable("No Groq/OpenAI-compatible API key configured.")

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    body: dict[str, Any] = {
        "model": model or settings.llm_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }
    if schema:
        body["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "debrief_schema",
                "schema": schema,
                "strict": True,
            },
        }
    else:
        body["response_format"] = {"type": "json_object"}

    raw = await _post_chat(body)
    try:
        return json.loads(raw), raw, model or settings.llm_model
    except json.JSONDecodeError:
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned), raw, model or settings.llm_model


async def _post_chat(body: dict[str, Any]) -> str:
    settings = get_settings()
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }
    url = f"{settings.llm_base_url}/chat/completions"

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(url, headers=headers, json=body)
        if response.status_code >= 400 and body.get("response_format", {}).get("type") == "json_schema":
            body = {**body, "response_format": {"type": "json_object"}}
            response = await client.post(url, headers=headers, json=body)

    response.raise_for_status()
    payload = response.json()
    return payload["choices"][0]["message"]["content"]

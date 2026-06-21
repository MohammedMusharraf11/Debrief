from collections import Counter
from typing import Any

from pydantic import ValidationError

from app.models.debrief import GeneratedDebrief
from app.services.llm_client import LLMUnavailable, chat_json


DEBRIEF_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "key_findings": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "finding": {"type": "string"},
                    "source": {
                        "type": "string",
                        "enum": ["notes", "voice", "photo", "handwritten", "video", "metadata", "mixed"],
                    },
                },
                "required": ["finding", "source"],
            },
        },
        "blockers": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "description": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": [
                            "infrastructure",
                            "governance",
                            "financial",
                            "capacity",
                            "coordination",
                            "access",
                            "other",
                        ],
                    },
                    "severity": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["description", "category", "severity"],
            },
        },
        "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative", "mixed"]},
        "sentiment_rationale": {"type": "string"},
        "follow_ups": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "action": {"type": "string"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                    "assignee_hint": {"type": ["string", "null"]},
                },
                "required": ["action", "priority", "assignee_hint"],
            },
        },
    },
    "required": ["key_findings", "blockers", "sentiment", "sentiment_rationale", "follow_ups"],
}


SYSTEM_PROMPT = """You are an AI assistant for The/Nudge Institute's field debrief tool.
Given a field visit's structured data and any attached media transcripts/captions, produce a concise JSON debrief.

Rules:
- Pull findings directly from the provided data. Do not fabricate.
- Severity: high blocks program delivery, medium degrades quality, low is a minor inconvenience.
- Sentiment reflects the overall community/program vibe observed.
- Follow-ups should be specific and actionable.
- If information is sparse, produce fewer items rather than padding."""


async def generate_debrief(visit: dict[str, Any], media_items: list[dict[str, Any]]) -> tuple[GeneratedDebrief, str, str]:
    user_prompt = assemble_prompt(visit, media_items)
    try:
        payload, raw, model = await chat_json(
            system=SYSTEM_PROMPT,
            user=user_prompt,
            schema=DEBRIEF_SCHEMA,
            max_tokens=1800,
        )
        try:
            return GeneratedDebrief.model_validate(normalize_debrief_payload(payload)), raw, model
        except ValidationError:
            fallback = heuristic_debrief(visit, media_items)
            return fallback, raw, f"{model}-validation-fallback"
    except LLMUnavailable:
        fallback = heuristic_debrief(visit, media_items)
        return fallback, fallback.model_dump_json(), "local-fallback"


def assemble_prompt(visit: dict[str, Any], media_items: list[dict[str, Any]]) -> str:
    lines = [
        "Structured context:",
        f"- Visit date: {visit.get('visit_date')}",
        f"- Visitor: {visit.get('visitor_name')}",
        f"- Location: {visit.get('village') or ''}, {visit.get('district')}, {visit.get('state')} {visit.get('postal_code') or ''}",
        f"- Program area: {visit.get('program_area')}",
        f"- Stakeholders met: {', '.join(visit.get('stakeholders') or []) or 'Not specified'}",
        "- Four pillars status: "
        f"Governance={visit.get('pillar_governance')}, "
        f"Financials={visit.get('pillar_financials')}, "
        f"Activities={visit.get('pillar_activities')}, "
        f"Outcomes={visit.get('pillar_outcomes')}",
        f"- Free-form notes: {visit.get('notes') or 'None'}",
        "",
        "Attached media transcripts/captions:",
    ]
    completed = [item for item in media_items if item.get("processing_status") == "completed" and item.get("extracted_text")]
    if not completed:
        lines.append("- None")
    for index, item in enumerate(completed, start=1):
        lines.append(f"- [{item.get('media_type')} {index}]: {item.get('extracted_text')}")
    return "\n".join(lines)


def normalize_debrief_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "key_findings": [_normalize_finding(item) for item in _as_list(payload.get("key_findings") or payload.get("findings"))],
        "blockers": [_normalize_blocker(item) for item in _as_list(payload.get("blockers"))],
        "sentiment": _normalize_choice(
            payload.get("sentiment"),
            {"positive", "neutral", "negative", "mixed"},
            default="neutral",
        ),
        "sentiment_rationale": str(
            payload.get("sentiment_rationale")
            or payload.get("rationale")
            or payload.get("sentiment_reason")
            or ""
        ),
        "follow_ups": [_normalize_follow_up(item) for item in _as_list(payload.get("follow_ups") or payload.get("followups"))],
    }


def _normalize_finding(item: Any) -> dict[str, str]:
    if isinstance(item, str):
        return {"finding": item, "source": "mixed"}
    if not isinstance(item, dict):
        return {"finding": str(item), "source": "mixed"}
    return {
        "finding": str(item.get("finding") or item.get("description") or item.get("summary") or item.get("text") or ""),
        "source": _normalize_choice(
            item.get("source"),
            {"notes", "voice", "photo", "handwritten", "video", "metadata", "mixed"},
            default="mixed",
        ),
    }


def _normalize_blocker(item: Any) -> dict[str, str]:
    if isinstance(item, str):
        return {"description": item, "category": "other", "severity": "medium"}
    if not isinstance(item, dict):
        return {"description": str(item), "category": "other", "severity": "medium"}
    return {
        "description": str(item.get("description") or item.get("blocker") or item.get("issue") or item.get("text") or ""),
        "category": _normalize_category(item.get("category") or item.get("type")),
        "severity": _normalize_choice(item.get("severity") or item.get("priority"), {"high", "medium", "low"}, default="medium"),
    }


def _normalize_follow_up(item: Any) -> dict[str, str | None]:
    if isinstance(item, str):
        return {"action": item, "priority": "medium", "assignee_hint": None}
    if not isinstance(item, dict):
        return {"action": str(item), "priority": "medium", "assignee_hint": None}
    return {
        "action": str(
            item.get("action")
            or item.get("description")
            or item.get("task")
            or item.get("recommendation")
            or item.get("follow_up")
            or item.get("text")
            or ""
        ),
        "priority": _normalize_choice(item.get("priority") or item.get("severity"), {"high", "medium", "low"}, default="medium"),
        "assignee_hint": item.get("assignee_hint") or item.get("assignee") or item.get("owner"),
    }


def _normalize_category(value: Any) -> str:
    normalized = str(value or "other").strip().lower().replace(" ", "_")
    aliases = {
        "finance": "financial",
        "money": "financial",
        "funding": "financial",
        "infrastructure_condition": "infrastructure",
        "accessibility": "access",
        "staffing": "capacity",
        "training": "capacity",
        "coordination_issue": "coordination",
    }
    normalized = aliases.get(normalized, normalized)
    return _normalize_choice(
        normalized,
        {"infrastructure", "governance", "financial", "capacity", "coordination", "access", "other"},
        default="other",
    )


def _normalize_choice(value: Any, allowed: set[str], default: str) -> str:
    normalized = str(value or "").strip().lower().replace(" ", "_")
    return normalized if normalized in allowed else default


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def heuristic_debrief(visit: dict[str, Any], media_items: list[dict[str, Any]]) -> GeneratedDebrief:
    text_parts = [visit.get("notes") or ""]
    text_parts.extend(item.get("extracted_text") or "" for item in media_items)
    text = "\n".join(part for part in text_parts if part).strip()
    findings = []
    if text:
        first = text.split(".")[0].strip()
        if first:
            findings.append({"finding": first[:280], "source": "mixed"})
    if not findings:
        findings.append(
            {
                "finding": f"Visit logged for {visit.get('program_area')} in {visit.get('village') or visit.get('district')}, {visit.get('state')}.",
                "source": "metadata",
            }
        )

    pillar_statuses = {
        "governance": visit.get("pillar_governance"),
        "financial": visit.get("pillar_financials"),
        "coordination": visit.get("pillar_activities"),
        "capacity": visit.get("pillar_outcomes"),
    }
    blockers = []
    severity_counts = Counter()
    for category, status in pillar_statuses.items():
        if status in {"at_risk", "off_track"}:
            severity = "high" if status == "off_track" else "medium"
            severity_counts[severity] += 1
            blockers.append(
                {
                    "description": f"{category.title()} pillar marked {status.replace('_', ' ')}.",
                    "category": category,
                    "severity": severity,
                }
            )

    negative_markers = ["blocked", "delay", "issue", "risk", "problem", "failed", "shortage", "not working"]
    positive_markers = ["improved", "good", "resolved", "on track", "positive", "completed"]
    lower = text.lower()
    if any(marker in lower for marker in negative_markers) or severity_counts["high"]:
        sentiment = "negative" if severity_counts["high"] else "mixed"
    elif any(marker in lower for marker in positive_markers):
        sentiment = "positive"
    else:
        sentiment = "neutral"

    follow_ups = [
        {
            "action": f"Review {item['category']} pillar and assign owner for next field check-in.",
            "priority": item["severity"],
            "assignee_hint": "Program manager",
        }
        for item in blockers[:5]
    ]

    return GeneratedDebrief(
        key_findings=findings[:5],
        blockers=blockers[:8],
        sentiment=sentiment,
        sentiment_rationale="Generated from submitted notes, media text, and quick pillar statuses.",
        follow_ups=follow_ups,
    )

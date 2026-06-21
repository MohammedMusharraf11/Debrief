from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class FindingItem(BaseModel):
    finding: str = Field(min_length=1)
    source: Literal["notes", "voice", "photo", "handwritten", "video", "metadata", "mixed"]


class BlockerItem(BaseModel):
    description: str = Field(min_length=1)
    category: Literal[
        "infrastructure",
        "governance",
        "financial",
        "capacity",
        "coordination",
        "access",
        "other",
    ]
    severity: Literal["high", "medium", "low"]


class FollowUpItem(BaseModel):
    action: str = Field(min_length=1)
    priority: Literal["high", "medium", "low"]
    assignee_hint: str | None = None


class GeneratedDebrief(BaseModel):
    key_findings: list[FindingItem] = Field(default_factory=list)
    blockers: list[BlockerItem] = Field(default_factory=list)
    sentiment: Literal["positive", "neutral", "negative", "mixed"] = "neutral"
    sentiment_rationale: str = ""
    follow_ups: list[FollowUpItem] = Field(default_factory=list)


class DebriefResponse(GeneratedDebrief):
    id: UUID
    visit_id: UUID
    created_at: datetime
    raw_llm_response: str | None = None
    model_used: str | None = None

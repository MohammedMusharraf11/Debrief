from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


PillarStatus = Literal["on_track", "at_risk", "off_track", "not_observed"]


class VisitCreate(BaseModel):
    visitor_name: str = Field(min_length=1, max_length=160)
    visit_date: date = Field(default_factory=date.today)
    state: str = Field(min_length=1, max_length=120)
    district: str = Field(min_length=1, max_length=120)
    block: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=160)
    postal_code: str | None = Field(default=None, max_length=20)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    program_area: str = Field(min_length=1, max_length=120)
    stakeholders: list[str] = Field(default_factory=list)
    pillar_governance: PillarStatus = "not_observed"
    pillar_financials: PillarStatus = "not_observed"
    pillar_activities: PillarStatus = "not_observed"
    pillar_outcomes: PillarStatus = "not_observed"
    notes: str | None = None


class VisitUpdate(BaseModel):
    visitor_name: str | None = Field(default=None, min_length=1, max_length=160)
    visit_date: date | None = None
    state: str | None = Field(default=None, min_length=1, max_length=120)
    district: str | None = Field(default=None, min_length=1, max_length=120)
    block: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=160)
    postal_code: str | None = Field(default=None, max_length=20)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    program_area: str | None = Field(default=None, min_length=1, max_length=120)
    stakeholders: list[str] | None = None
    pillar_governance: PillarStatus | None = None
    pillar_financials: PillarStatus | None = None
    pillar_activities: PillarStatus | None = None
    pillar_outcomes: PillarStatus | None = None
    notes: str | None = None


class VisitResponse(VisitCreate):
    id: UUID
    created_at: datetime
    debrief_status: Literal["pending", "processing", "completed", "failed"]


class VisitListResponse(BaseModel):
    items: list[VisitResponse]
    limit: int
    offset: int

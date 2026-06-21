from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.database import get_supabase, response_data
from app.services.patterns import blocker_patterns, sentiment_trends, stats

router = APIRouter()


@router.get("/debriefs")
def list_debriefs(
    supabase: Client = Depends(get_supabase),
    state: str | None = None,
    district: str | None = None,
    block: str | None = None,
    program_area: str | None = None,
    sentiment: str | None = None,
    blocker_category: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    format: str = Query(default="json", pattern="^(json|geo)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows = _combined_rows(
        supabase,
        state=state,
        district=district,
        block=block,
        program_area=program_area,
        date_from=date_from,
        date_to=date_to,
    )
    rows = _filter_combined(rows, sentiment=sentiment, blocker_category=blocker_category, search=search)
    if format == "geo":
        return _as_geojson(rows)
    return {"items": rows[offset : offset + limit], "limit": limit, "offset": offset, "total": len(rows)}


@router.get("/stats")
def dashboard_stats(
    supabase: Client = Depends(get_supabase),
    state: str | None = None,
    district: str | None = None,
    block: str | None = None,
    program_area: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    rows = _combined_rows(
        supabase,
        state=state,
        district=district,
        block=block,
        program_area=program_area,
        date_from=date_from,
        date_to=date_to,
    )
    return stats(rows)


@router.get("/patterns/blockers")
def blocker_pattern_endpoint(
    supabase: Client = Depends(get_supabase),
    state: str | None = None,
    district: str | None = None,
    program_area: str | None = None,
):
    return blocker_patterns(_combined_rows(supabase, state=state, district=district, program_area=program_area))


@router.get("/patterns/sentiment")
def sentiment_pattern_endpoint(
    supabase: Client = Depends(get_supabase),
    state: str | None = None,
    district: str | None = None,
    program_area: str | None = None,
):
    return sentiment_trends(_combined_rows(supabase, state=state, district=district, program_area=program_area))


def _combined_rows(
    supabase: Client,
    *,
    state: str | None = None,
    district: str | None = None,
    block: str | None = None,
    program_area: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict[str, Any]]:
    query = supabase.table("visits").select("*")
    for column, value in {
        "state": state,
        "district": district,
        "block": block,
        "program_area": program_area,
    }.items():
        if value:
            query = query.eq(column, value)
    if date_from:
        query = query.gte("visit_date", date_from.isoformat())
    if date_to:
        query = query.lte("visit_date", date_to.isoformat())

    visits = response_data(query.order("visit_date", desc=True).limit(1000).execute())
    if not visits:
        return []

    visit_ids = [visit["id"] for visit in visits]
    summaries = response_data(
        supabase.table("debrief_summaries").select("*").in_("visit_id", visit_ids).execute()
    )
    by_visit = {summary["visit_id"]: summary for summary in summaries}
    return [{"visit": visit, "debrief": by_visit.get(visit["id"]) or {}} for visit in visits]


def _filter_combined(
    rows: list[dict[str, Any]],
    *,
    sentiment: str | None,
    blocker_category: str | None,
    search: str | None,
) -> list[dict[str, Any]]:
    filtered = rows
    if sentiment:
        filtered = [row for row in filtered if _debrief(row).get("sentiment") == sentiment]
    if blocker_category:
        filtered = [
            row
            for row in filtered
            if any(blocker.get("category") == blocker_category for blocker in _debrief(row).get("blockers") or [])
        ]
    if search:
        needle = search.lower()
        filtered = [row for row in filtered if needle in _search_blob(row)]
    return filtered


def _search_blob(row: dict[str, Any]) -> str:
    visit = row.get("visit") or {}
    debrief = _debrief(row)
    pieces = [
        visit.get("notes") or "",
        visit.get("visitor_name") or "",
        visit.get("state") or "",
        visit.get("district") or "",
        visit.get("block") or "",
        visit.get("village") or "",
        debrief.get("sentiment_rationale") or "",
    ]
    pieces.extend(item.get("finding", "") for item in debrief.get("key_findings") or [])
    pieces.extend(item.get("description", "") for item in debrief.get("blockers") or [])
    return " ".join(pieces).lower()


def _as_geojson(rows: list[dict[str, Any]]) -> dict[str, Any]:
    features = []
    for row in rows:
        visit = row["visit"]
        debrief = _debrief(row)
        if visit.get("latitude") is None or visit.get("longitude") is None:
            continue
        findings = debrief.get("key_findings") or []
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [visit["longitude"], visit["latitude"]]},
                "properties": {
                    "id": visit["id"],
                    "visit_date": visit.get("visit_date"),
                    "visitor_name": visit.get("visitor_name"),
                    "postal_code": visit.get("postal_code"),
                    "location_label": ", ".join(part for part in [visit.get("village"), visit.get("district")] if part),
                    "sentiment": debrief.get("sentiment"),
                    "blocker_count": len(debrief.get("blockers") or []),
                    "first_finding": findings[0].get("finding") if findings else None,
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def _debrief(row: dict[str, Any]) -> dict[str, Any]:
    debrief = row.get("debrief")
    return debrief if isinstance(debrief, dict) else {}

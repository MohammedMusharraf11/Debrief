from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.database import first_row, get_supabase, response_data
from app.models.visit import VisitCreate, VisitListResponse, VisitResponse, VisitUpdate

router = APIRouter()


@router.post("/visits", response_model=VisitResponse, status_code=201)
def create_visit(payload: VisitCreate, supabase: Client = Depends(get_supabase)):
    response = supabase.table("visits").insert(payload.model_dump(mode="json")).execute()
    return first_row(response)


@router.get("/visits", response_model=VisitListResponse)
def list_visits(
    supabase: Client = Depends(get_supabase),
    state: str | None = None,
    district: str | None = None,
    block: str | None = None,
    program_area: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
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

    response = query.order("visit_date", desc=True).range(offset, offset + limit - 1).execute()
    return {"items": response_data(response), "limit": limit, "offset": offset}


@router.get("/visits/{visit_id}", response_model=VisitResponse)
def get_visit(visit_id: UUID, supabase: Client = Depends(get_supabase)):
    response = supabase.table("visits").select("*").eq("id", str(visit_id)).limit(1).execute()
    return first_row(response)


@router.patch("/visits/{visit_id}", response_model=VisitResponse)
def update_visit(visit_id: UUID, payload: VisitUpdate, supabase: Client = Depends(get_supabase)):
    updates = payload.model_dump(mode="json", exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields supplied for update.")
    response = supabase.table("visits").update(updates).eq("id", str(visit_id)).execute()
    return first_row(response)

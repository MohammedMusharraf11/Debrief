from uuid import UUID

from fastapi import APIRouter, Depends
from supabase import Client

from app.database import first_row, get_supabase, response_data
from app.models.debrief import DebriefResponse
from app.services.debrief_chain import generate_debrief

router = APIRouter()


@router.post("/visits/{visit_id}/debrief", response_model=DebriefResponse)
async def create_debrief(visit_id: UUID, supabase: Client = Depends(get_supabase)):
    visit = first_row(supabase.table("visits").select("*").eq("id", str(visit_id)).limit(1).execute())
    supabase.table("visits").update({"debrief_status": "processing"}).eq("id", str(visit_id)).execute()

    media_items = response_data(
        supabase.table("media_items").select("*").eq("visit_id", str(visit_id)).order("created_at").execute()
    )
    try:
        generated, raw, model = await generate_debrief(visit, media_items)
        payload = {
            "visit_id": str(visit_id),
            "key_findings": [item.model_dump() for item in generated.key_findings],
            "blockers": [item.model_dump() for item in generated.blockers],
            "sentiment": generated.sentiment,
            "sentiment_rationale": generated.sentiment_rationale,
            "follow_ups": [item.model_dump() for item in generated.follow_ups],
            "raw_llm_response": raw,
            "model_used": model,
        }
        response = (
            supabase.table("debrief_summaries")
            .upsert(payload, on_conflict="visit_id")
            .execute()
        )
        row = first_row(response)
        supabase.table("visits").update({"debrief_status": "completed"}).eq("id", str(visit_id)).execute()
        return row
    except Exception:
        supabase.table("visits").update({"debrief_status": "failed"}).eq("id", str(visit_id)).execute()
        raise


@router.get("/visits/{visit_id}/debrief", response_model=DebriefResponse)
def get_debrief(visit_id: UUID, supabase: Client = Depends(get_supabase)):
    response = supabase.table("debrief_summaries").select("*").eq("visit_id", str(visit_id)).limit(1).execute()
    return first_row(response)

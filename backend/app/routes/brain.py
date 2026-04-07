from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.utils.supabase_client import supabase_anon, supabase_service
from app.services.brain import (
    detect_intent, handle_pricing_update, handle_generate_document,
    handle_forward, handle_schedule_scan, handle_text_customer,
    build_brain_prompt,
)
from app.services.agent import generate_response

router = APIRouter()
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        user_response = supabase_anon.auth.get_user(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_response.user


async def get_user_business(user_id: str) -> dict:
    result = supabase_service.table("businesses").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No business found for this account")
    return result.data[0]


def _get_schedule_context(business_id: str) -> str:
    """Inject a brief schedule summary into general Brain prompts."""
    try:
        from app.services.calendar_service import get_all_slots
        slots = get_all_slots(business_id)
        booked = [s for s in slots if s.get("booked")]
        if not booked:
            return "No bookings this week."
        lines = [
            f"  • {b['date']} {b['time']} — {b.get('customer_phone','?')} | {b.get('customer_address','no address')} | {b.get('notes','') or 'no summary'}"
            for b in booked
        ]
        return f"{len(booked)} booking(s) this week:\n" + "\n".join(lines)
    except Exception:
        return ""


class BrainMessage(BaseModel):
    message: str
    reset: bool = False


@router.post("/api/brain/chat")
async def brain_chat(body: BrainMessage, user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    if body.reset:
        return {"response": "", "reset": True}

    intent = detect_intent(body.message)

    # --- Schedule scan ---
    if intent == "schedule_scan":
        result = await handle_schedule_scan(business["id"])
        return {
            "response": result["response"],
            "intent": intent,
            "action_executed": "schedule_scan",
            "bookings": result.get("bookings", []),
            "flagged": result.get("flagged", []),
        }

    # --- Text a customer ---
    if intent == "text_customer":
        result = await handle_text_customer(body.message, business["id"])
        return {"response": result, "intent": intent, "action_executed": "text_customer"}

    # --- Pricing update ---
    if intent == "pricing_update":
        result = await handle_pricing_update(body.message, business["id"])
        return {"response": result, "intent": intent, "action_executed": "pricing_update"}

    # --- Generate document (inline — no tab switching) ---
    if intent == "generate_document":
        doc_data = await handle_generate_document(body.message, business)
        if "error" in doc_data:
            return {"response": doc_data["error"], "intent": intent, "action_executed": None}

        try:
            from app.services.pdf_service import generate_and_store_document
            record = await generate_and_store_document(doc_data, business["id"])
            doc_type = record.get("doc_type", "document").capitalize()
            doc_number = record.get("doc_number", "")
            total = record.get("total", 0)
            pdf_url = record.get("pdf_url", "")
            customer_name = record.get("customer_name") or record.get("customer_phone") or "customer"
            response_text = (
                f"{doc_type} {doc_number} created for {customer_name} — "
                f"total ${total:.2f}. Ready to share."
            )
            return {
                "response": response_text,
                "intent": intent,
                "action_executed": "document_created",
                "document": record,
                "pdf_url": pdf_url,
            }
        except Exception as e:
            print(f"Brain inline doc error: {e}")
            # Fallback: return prefill for manual generation
            return {
                "response": f"Parsed the {doc_data.get('doc_type','document')} details — tap below to generate.",
                "intent": intent,
                "action_executed": None,
                "prefill_document": doc_data,
            }

    # --- Forward ---
    if intent == "forward":
        result = await handle_forward(body.message, business["id"])
        return {"response": result, "intent": intent, "action_executed": "forward"}

    # --- General (with schedule context injected) ---
    schedule_context = _get_schedule_context(business["id"])
    prompt = build_brain_prompt(body.message, business["name"], schedule_context, agent_name=business.get("agent_name") or "Anna")
    response, _ = await generate_response(prompt)
    return {"response": response, "intent": intent, "action_executed": None}


@router.delete("/api/brain/history")
async def clear_brain_history(user=Depends(get_current_user)):
    return {"cleared": True}

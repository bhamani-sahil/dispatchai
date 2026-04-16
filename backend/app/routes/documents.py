from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from app.utils.supabase_client import supabase_anon, supabase_service
from app.services.pdf_service import generate_and_store_document

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


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class LineItem(BaseModel):
    description: str
    qty: float = 1
    unit_price: float


class CustomerInfo(BaseModel):
    name: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""


class GenerateDocumentRequest(BaseModel):
    doc_type: str = "quote"           # "quote" or "invoice"
    customer: CustomerInfo
    line_items: list[LineItem]
    tax_rate: float = 0.05
    notes: Optional[str] = ""
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    conversation_id: Optional[str] = None


class SendDocumentRequest(BaseModel):
    method: str = "sms"               # "sms" or "email"
    to: str                           # phone (E.164) or email address


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/api/documents/generate", status_code=201)
async def generate_document(body: GenerateDocumentRequest, user=Depends(get_current_user)):
    business = await get_user_business(user.id)

    doc_data = {
        "doc_type": body.doc_type,
        "customer": body.customer.model_dump(),
        "line_items": [item.model_dump() for item in body.line_items],
        "tax_rate": body.tax_rate,
        "notes": body.notes,
        "issue_date": body.issue_date,
        "due_date": body.due_date,
        "conversation_id": body.conversation_id,
        "business": {
            "name": business["name"],
            "service_area": business.get("service_area", ""),
            "emergency_phone": business.get("emergency_phone", ""),
        },
    }

    try:
        record = await generate_and_store_document(doc_data, business["id"])
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate document: {str(e)}")

    return record


@router.get("/api/documents")
async def list_documents(user=Depends(get_current_user)):
    business = await get_user_business(user.id)
    result = supabase_service.table("documents").select("*").eq(
        "business_id", business["id"]
    ).order("created_at", desc=True).execute()
    return result.data or []


@router.get("/api/documents/{doc_id}")
async def get_document(doc_id: str, user=Depends(get_current_user)):
    business = await get_user_business(user.id)
    result = supabase_service.table("documents").select("*").eq("id", doc_id).eq(
        "business_id", business["id"]
    ).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return result.data[0]


@router.post("/api/documents/{doc_id}/send")
async def send_document(doc_id: str, body: SendDocumentRequest, user=Depends(get_current_user)):
    business = await get_user_business(user.id)
    result = supabase_service.table("documents").select("*").eq("id", doc_id).eq(
        "business_id", business["id"]
    ).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = result.data[0]

    if not doc.get("pdf_url"):
        raise HTTPException(status_code=400, detail="Document has no PDF URL yet")

    if body.method == "sms":
        from app.services.twilio_service import send_sms
        msg = (
            f"Hi! Here's your {doc['doc_type']} {doc['doc_number']} from {business['name']}. "
            f"Total: ${doc['total']:.2f}. View/download: {doc['pdf_url']}"
        )
        send_sms(to=body.to, body=msg)
    else:
        raise HTTPException(status_code=400, detail="Only 'sms' method is supported right now")

    # Mark as sent
    supabase_service.table("documents").update({"status": "sent"}).eq("id", doc_id).execute()

    return {"sent": True, "method": body.method, "to": body.to}


@router.delete("/api/documents/{doc_id}", status_code=204)
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    business = await get_user_business(user.id)
    supabase_service.table("documents").update({"status": "void"}).eq("id", doc_id).eq(
        "business_id", business["id"]
    ).execute()

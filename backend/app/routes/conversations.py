from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.utils.supabase_client import supabase_anon, supabase_service
from app.models.conversation import ConversationResponse, MessageResponse

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


@router.get("/api/conversations", response_model=list[ConversationResponse])
async def get_conversations(user=Depends(get_current_user)):
    biz_result = supabase_service.table("businesses").select("id").eq("user_id", user.id).execute()
    if not biz_result.data:
        return []

    business_ids = [b["id"] for b in biz_result.data]

    result = supabase_service.table("conversations").select("*").in_("business_id", business_ids).order("last_message_at", desc=True).execute()
    conversations = result.data or []

    if conversations:
        conv_ids = [c["id"] for c in conversations]
        msgs = supabase_service.table("messages").select(
            "conversation_id, body, sender_type, ai_confidence, created_at"
        ).in_("conversation_id", conv_ids).order("created_at", desc=True).execute()

        last_msg_map: dict = {}
        conf_map: dict = {}
        for msg in (msgs.data or []):
            cid = msg["conversation_id"]
            if cid not in last_msg_map:
                last_msg_map[cid] = msg.get("body", "")
            if cid not in conf_map and msg.get("sender_type") == "ai_agent" and msg.get("ai_confidence") is not None:
                conf_map[cid] = msg["ai_confidence"]

        for c in conversations:
            c["last_message"] = last_msg_map.get(c["id"])
            c["ai_confidence"] = conf_map.get(c["id"])

    return conversations


@router.get("/api/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(conversation_id: str, user=Depends(get_current_user)):
    # Verify conversation exists
    convo_result = supabase_service.table("conversations").select("business_id").eq("id", conversation_id).single().execute()
    if not convo_result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Verify the business belongs to this user
    biz_result = supabase_service.table("businesses").select("id").eq("id", convo_result.data["business_id"]).eq("user_id", user.id).execute()
    if not biz_result.data:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = supabase_service.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
    messages = result.data or []
    for msg in messages:
        msg["direction"] = "inbound" if msg.get("sender_type") == "customer" else "outbound"
    return messages


async def _verify_conversation_owner(conversation_id: str, user_id: str) -> dict:
    """Returns conversation if it belongs to this user's business, else raises 403/404."""
    convo = supabase_service.table("conversations").select("*").eq("id", conversation_id).single().execute()
    if not convo.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    biz = supabase_service.table("businesses").select("*").eq("id", convo.data["business_id"]).eq("user_id", user_id).execute()
    if not biz.data:
        raise HTTPException(status_code=403, detail="Forbidden")
    convo.data["_business"] = biz.data[0]
    return convo.data


@router.put("/api/conversations/{conversation_id}/takeover")
async def takeover(conversation_id: str, user=Depends(get_current_user)):
    """Owner takes over — AI stops responding."""
    await _verify_conversation_owner(conversation_id, user.id)
    try:
        supabase_service.table("conversations").update({
            "status": "human_takeover"
        }).eq("id", conversation_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "human_takeover"}


@router.put("/api/conversations/{conversation_id}/handback")
async def handback(conversation_id: str, user=Depends(get_current_user)):
    """Owner hands back to AI."""
    await _verify_conversation_owner(conversation_id, user.id)
    try:
        supabase_service.table("conversations").update({
            "status": "ai_handling"
        }).eq("id", conversation_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ai_handling"}


class OwnerReplyBody(BaseModel):
    message: str = ""
    body: str = ""   # alias — mobile sends 'body', accept both

    def get_text(self) -> str:
        return (self.message or self.body).strip()


@router.post("/api/conversations/{conversation_id}/reply")
async def owner_reply(conversation_id: str, body: OwnerReplyBody, user=Depends(get_current_user)):
    """Owner sends a manual SMS reply. Saves to DB and sends via Twilio."""
    convo = await _verify_conversation_owner(conversation_id, user.id)
    business = convo["_business"]

    text = body.get_text()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Save to messages
    try:
        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "business_owner",
            "body": text,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")

    # Send SMS if business has a twilio_phone
    if business.get("twilio_phone"):
        try:
            from app.services.twilio_service import send_sms
            send_sms(to=convo["customer_phone"], body=text)
        except Exception as e:
            print(f"Owner reply SMS error: {e}")
            # Don't fail the request — message is already saved

    # Update last_message_at
    supabase_service.table("conversations").update({
        "last_message_at": "now()"
    }).eq("id", conversation_id).execute()

    return {"sent": True}

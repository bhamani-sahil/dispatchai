import asyncio
import random
from fastapi import APIRouter, Request, Response
from app.utils.supabase_client import supabase_service
from app.services.agent import generate_response, summarize_booking
from app.services.prompt_builder import build_prompt
from app.services.telnyx_service import send_sms
from app.services.calendar_service import get_available_slots, book_slot

router = APIRouter()

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
_processed_message_ids: set[str] = set()  # Dedup within a single server session


def _best_slot_match(day_slots: list[dict], text: str) -> dict:
    import re
    text_lower = text.lower()
    time_mentions: set[tuple] = set()
    for m in re.finditer(r"\b(\d{1,2}):\d{2}\s*(am|pm)?\s*[-–]\s*\d{1,2}:\d{2}\s*(am|pm)\b", text_lower):
        start_mer = m.group(2) if m.group(2) else m.group(3)
        time_mentions.add((int(m.group(1)), start_mer))
    for m in re.finditer(r"\b(\d{1,2})\s*[-–]\s*\d{1,2}\s*(am|pm)\b", text_lower):
        time_mentions.add((int(m.group(1)), m.group(2)))
    for m in re.finditer(r"\b(\d{1,2})(?::\d{2})?\s*(am|pm)\b", text_lower):
        time_mentions.add((int(m.group(1)), m.group(2)))
    for slot in day_slots:
        hour_m = re.match(r"(\d{1,2})", slot["time"])
        mer_m = re.search(r"(am|pm)", slot["time"], re.I)
        if not hour_m or not mer_m:
            continue
        if (int(hour_m.group(1)), mer_m.group(1).lower()) in time_mentions:
            return slot
    return day_slots[0]


async def _detect_and_book(ai_text: str, messages: list[dict], customer_phone: str, conversation_id: str, business_id: str = None, business_hours: dict = None):
    # Check Supabase directly — restart-safe, no in-memory state needed
    already = supabase_service.table("bookings").select("id").eq(
        "conversation_id", conversation_id
    ).limit(1).execute()
    if already.data:
        return
    text = ai_text.lower()
    if not any(w in text for w in ["booked!", "booked,", "booked ✓", "see you monday", "see you tuesday",
                                    "see you wednesday", "see you thursday", "see you friday", "see you saturday",
                                    "see you sunday"]):
        return
    for day in DAYS:
        if day not in text:
            continue
        day_slots = [s for s in get_available_slots(business_id, business_hours=business_hours) if s["date_short"].lower() == day]
        if not day_slots:
            continue
        chosen = _best_slot_match(day_slots, text)
        notes = await summarize_booking(messages)
        booked = book_slot(chosen["id"], customer_phone, "", notes, business_id, conversation_id)
        if booked:
            print(f"[{conversation_id}] Booked → Supabase: {chosen['date']} {chosen['time']} — {notes[:60]}")
        return


def _human_delay(message_length: int) -> float:
    """Return a realistic delay in seconds based on incoming message length."""
    read_time = min(message_length * 0.05, 10)   # ~50ms per char, max 10s
    type_time = random.uniform(15, 40)             # typing time
    return read_time + type_time


async def _process_message(payload: dict):
    try:
        event = payload.get("data", {})
        msg = event.get("payload", {})
        message_id = msg.get("id", "")
        customer_phone = msg.get("from", {}).get("phone_number", "")
        twilio_phone = msg.get("to", [{}])[0].get("phone_number", "")
        body = msg.get("text", "").strip()

        # Deduplicate — Telnyx retries if we don't respond fast enough
        if message_id in _processed_message_ids:
            print(f"Duplicate message {message_id}, skipping")
            return
        _processed_message_ids.add(message_id)

        print(f"Telnyx inbound from {customer_phone}: {body}")

        # 1. Find business by phone number
        biz_result = supabase_service.table("businesses").select("*").eq("twilio_phone", twilio_phone).execute()
        if not biz_result.data:
            # Fallback: use first business (useful for single-tenant testing)
            biz_result = supabase_service.table("businesses").select("*").limit(1).execute()
        if not biz_result.data:
            return Response(status_code=200)

        business = biz_result.data[0]
        business_id = business["id"]

        # 2. Find or create conversation
        convo_result = supabase_service.table("conversations").select("*").eq("business_id", business_id).eq("customer_phone", customer_phone).eq("status", "ai_handling").execute()

        if convo_result.data:
            conversation_id = convo_result.data[0]["id"]
        else:
            new_convo = supabase_service.table("conversations").insert({
                "business_id": business_id,
                "customer_phone": customer_phone,
                "status": "ai_handling",
            }).execute()
            conversation_id = new_convo.data[0]["id"]

        # 3. Save customer message immediately
        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "customer",
            "body": body,
        }).execute()

        # 4. Get conversation history and services
        history_result = supabase_service.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        messages = history_result.data or []

        services_result = supabase_service.table("services").select("*").eq("business_id", business_id).eq("is_active", True).execute()
        services = services_result.data or []

        # 5. Message cap — stop Gemini being called on runaway conversations
        if len(messages) > 20:
            print(f"[{conversation_id}] Message cap hit — closing conversation")
            await send_sms(to=customer_phone, body="Thanks for reaching out! To continue, please text us again anytime. 👍")
            supabase_service.table("conversations").update({"status": "closed"}).eq("id", conversation_id).execute()
            return

        # 5b. Human-like delay
        delay = _human_delay(len(body))
        print(f"[{conversation_id}] Waiting {delay:.1f}s before replying...")
        await asyncio.sleep(delay)

        # 6. Build prompt and call Gemini
        prompt = build_prompt(business=business, services=services, messages=messages)
        ai_response, confidence = await generate_response(prompt)
        print(f"[{conversation_id}] Response ({len(ai_response)} chars): {ai_response}")

        # 7. Save AI response
        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "ai_agent",
            "body": ai_response,
            "ai_confidence": confidence,
        }).execute()

        # 8. Update conversation timestamp
        supabase_service.table("conversations").update({
            "last_message_at": "now()",
        }).eq("id", conversation_id).execute()

        # 9. Detect and book slot — persist to Supabase
        business_hours = business.get("business_hours") or None
        await _detect_and_book(ai_response, messages, customer_phone, conversation_id, business.get("id"), business_hours=business_hours)

        # 10. Send reply
        await send_sms(to=customer_phone, body=ai_response)
        print(f"[{conversation_id}] SMS sent to {customer_phone}")

    except Exception as e:
        print(f"Telnyx webhook error: {e}")


@router.post("/api/webhooks/telnyx/inbound")
async def telnyx_inbound(request: Request):
    try:
        payload = await request.json()
        event = payload.get("data", {})
        if event.get("event_type") != "message.received":
            return Response(status_code=200)
        # Fire and forget — return 200 immediately so Telnyx doesn't retry
        asyncio.create_task(_process_message(payload))
    except Exception as e:
        print(f"Telnyx inbound error: {e}")
    return Response(status_code=200)

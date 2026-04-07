import asyncio
import random
import re
from datetime import date, timedelta
from fastapi import APIRouter, Request, Response
from app.utils.supabase_client import supabase_service
from app.services.agent import generate_response, summarize_booking, score_confidence
from app.services.prompt_builder import build_prompt
from app.services.twilio_service import send_sms
from app.services.calendar_service import get_available_slots, book_slot, find_and_book

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

router = APIRouter()

TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

# Dedup — Twilio retries if we don't respond fast enough
_processed_sids: set[str] = set()


def normalize_phone(raw: str) -> str:
    """Normalize any phone format to +1XXX-XXX-XXXX. Falls back to original if not 10/11 digits."""
    digits = re.sub(r'\D', '', raw)
    if digits.startswith('1') and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10:
        return f"+1{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return raw


def _human_delay(message_length: int) -> float:
    """Return a realistic delay in seconds based on incoming message length."""
    read_time = min(message_length * 0.05, 10)   # ~50ms per char, max 10s
    type_time = random.uniform(15, 40)             # typing time
    return read_time + type_time

# ── Cancel / Reschedule intent ─────────────────────────────────────────────

_CANCEL_TRIGGERS = [
    "cancel", "need to cancel", "want to cancel", "please cancel",
    "can you cancel", "cancel my appointment", "cancel my booking",
    "can't make it", "cannot make it", "won't be able", "wont be able",
    "not going to make it", "not gonna make it",
]

_RESCHEDULE_TRIGGERS = [
    "reschedule", "move my", "move it to", "can you move", "can i move",
    "change my appointment", "change my booking", "switch to", "different time",
    "different day", "change it to", "push it to", "book me for instead",
]


def _detect_manage_intent(message: str) -> str:
    msg = message.lower()
    if any(t in msg for t in _CANCEL_TRIGGERS):
        return "cancel"
    if any(t in msg for t in _RESCHEDULE_TRIGGERS):
        return "reschedule"
    return "normal"


def _find_active_booking(customer_phone: str, business_id: str) -> dict | None:
    result = supabase_service.table("bookings").select("*").eq(
        "customer_phone", customer_phone
    ).eq("business_id", business_id).in_(
        "status", ["booked", "assigned"]
    ).gte("slot_date", date.today().isoformat()).order("slot_date").limit(1).execute()
    return result.data[0] if result.data else None


def _cancel_booking_by_id(booking_id: str):
    supabase_service.table("bookings").update({"status": "cancelled"}).eq("id", booking_id).execute()


def _parse_day_time(message: str) -> tuple[str, str]:
    msg = message.lower()
    day = next((d for d in DAYS if d in msg), "")
    if not day:
        if "tomorrow" in msg:
            day = (date.today() + timedelta(days=1)).strftime("%A").lower()
        elif "today" in msg:
            day = date.today().strftime("%A").lower()
    time_m = re.search(r"\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\b", msg)
    time_hint = f"{time_m.group(1)}{time_m.group(2)}" if time_m else ""
    return day, time_hint


async def _handle_cancel(customer_phone: str, business_id: str, conversation_id: str) -> str:
    booking = _find_active_booking(customer_phone, business_id)
    if not booking:
        return "I don't see any upcoming appointments under your number. Did you book under a different number? 🤔"
    _cancel_booking_by_id(booking["id"])
    return (
        f"Done! Your {booking['slot_date']} {booking['slot_time']} appointment has been cancelled. "
        f"Feel free to rebook anytime — just text us! 👍"
    )


async def _handle_reschedule(
    message: str, customer_phone: str, business_id: str, conversation_id: str, business_hours: dict = None
) -> str | None:
    """
    Returns a reply string if we handled it directly (no Gemini needed).
    Returns None if Gemini should handle it (slot unavailable / ambiguous).
    """
    booking = _find_active_booking(customer_phone, business_id)
    if not booking:
        return None  # Let Gemini handle — no booking found context

    day_hint, time_hint = _parse_day_time(message)
    if not day_hint:
        return None  # No day mentioned — let Gemini sort it out

    new_slot = find_and_book(
        day_hint, time_hint or "any",
        customer_phone,
        booking.get("customer_address", ""),
        booking.get("job_summary", ""),
        business_id,
        business_hours=business_hours,
    )

    if new_slot:
        _cancel_booking_by_id(booking["id"])
        old_label = f"{booking['slot_date']} {booking['slot_time']}"
        return (
            f"Done! Moved you from {old_label} to {new_slot['date']} {new_slot['time']}. "
            f"See you then! 😊"
        )

    # Requested slot is taken — return None so Gemini offers alternatives
    return None


def _best_slot_match(day_slots: list[dict], text: str) -> dict:
    """
    Extract (start_hour, meridiem) pairs from AI text, match against slot start times.
    Handles: '3-5 PM', '3pm', '3:00 pm', '8-10am', '10 AM-12 PM', etc.
    Falls back to first slot if nothing matches.
    """
    import re
    text_lower = text.lower()

    # Collect all (start_hour, meridiem) pairs mentioned in the text
    time_mentions: set[tuple] = set()
    # "3:00-5:00pm", "8:00-10:00am", "10:00am-12:00pm" — colon range format
    for m in re.finditer(r"\b(\d{1,2}):\d{2}\s*(am|pm)?\s*[-–]\s*\d{1,2}:\d{2}\s*(am|pm)\b", text_lower):
        start_mer = m.group(2) if m.group(2) else m.group(3)
        time_mentions.add((int(m.group(1)), start_mer))
    # "3-5 pm", "8-10am", "3–5 PM" — no-colon range format
    for m in re.finditer(r"\b(\d{1,2})\s*[-–]\s*\d{1,2}\s*(am|pm)\b", text_lower):
        time_mentions.add((int(m.group(1)), m.group(2)))
    # Single time: "3 pm", "3:00pm", "3pm"
    for m in re.finditer(r"\b(\d{1,2})(?::\d{2})?\s*(am|pm)\b", text_lower):
        time_mentions.add((int(m.group(1)), m.group(2)))

    for slot in day_slots:
        # Get start hour from slot (first digits)
        hour_m = re.match(r"(\d{1,2})", slot["time"])
        if not hour_m:
            continue
        slot_hour = int(hour_m.group(1))
        # Get first am/pm from slot string — correctly identifies start meridiem
        mer_m = re.search(r"(am|pm)", slot["time"], re.I)
        if not mer_m:
            continue
        slot_mer = mer_m.group(1).lower()
        if (slot_hour, slot_mer) in time_mentions:
            return slot

    return day_slots[0]


def _extract_address(messages: list[dict]) -> str:
    """Scan conversation history for a customer address."""
    import re
    # Street type suffixes — expanded to cover common Canadian street types
    STREET_TYPES = (
        r"drive|dr|avenue|ave|street|st|boulevard|blvd|way|road|rd|"
        r"terrace|terr|crescent|cres|court|ct|close|pl|place|lane|ln|"
        r"highway|hwy|trail|tr|grove|gate|bay|mews|view|rise|run|"
        r"circle|cir|loop|park|gardens|green|heath|hill|manor|mount|"
        r"path|point|ridge|row|square|sq|walk|wharf|wood"
    )
    # Primary pattern: number + words + known street type + optional quadrant
    pattern_strict = (
        rf"\b\d{{1,6}}(?:\s+[\w'-]{{1,20}}){{1,5}}\s+(?:{STREET_TYPES})\b"
        r"(?:\s+(?:nw|ne|sw|se|north|south|east|west))?"
    )
    # Fallback pattern: number + 2-4 words + optional quadrant (catches "123 Main NW")
    pattern_loose = (
        r"\b\d{1,6}(?:\s+[\w'-]{2,20}){2,4}"
        r"(?:\s+(?:nw|ne|sw|se))?\b"
    )
    for msg in reversed(messages):
        if msg.get("sender_type") != "customer":
            continue
        body = msg["body"]
        m = re.search(pattern_strict, body, re.I)
        if m:
            return m.group().strip()
        m = re.search(pattern_loose, body, re.I)
        if m:
            return m.group().strip()
    return ""


async def _detect_and_book(ai_text: str, messages: list[dict], customer_phone: str, conversation_id: str, business_id: str = None, customer_address: str = "", business_hours: dict = None):
    """Detect booking confirmation in AI response and persist to Supabase."""
    # Check Supabase directly — restart-safe, no in-memory state needed
    already = supabase_service.table("bookings").select("id").eq(
        "conversation_id", conversation_id
    ).limit(1).execute()
    if already.data:
        return
    text = ai_text.lower()
    if not any(w in text for w in ["booked!", "booked,", "booked ✓", "see you monday", "see you tuesday",
                                    "see you wednesday", "see you thursday", "see you friday", "see you saturday",
                                    "all set for monday", "all set for tuesday", "all set for wednesday",
                                    "all set for thursday", "all set for friday", "all set for saturday",
                                    "you're all set", "you are all set", "confirmed for"]):
        return
    for day in DAYS:
        if day not in text:
            continue
        day_slots = [s for s in get_available_slots(business_id, business_hours=business_hours) if s["date_short"].lower() == day]
        if not day_slots:
            continue
        chosen = _best_slot_match(day_slots, text)
        notes = await summarize_booking(messages)
        address = customer_address or _extract_address(messages)
        print(f"[{conversation_id}] Address extracted: '{address}' | Phone: '{customer_phone}'")
        booked = book_slot(chosen["id"], customer_phone, address, notes, business_id, conversation_id)
        if booked:
            print(f"[{conversation_id}] Booked → Supabase: {chosen['date']} {chosen['time']} — {notes[:60]}")
        return


async def _process_message(form_data: dict):
    try:
        customer_phone = normalize_phone(form_data.get("From", ""))
        twilio_phone = form_data.get("To", "")
        body = form_data.get("Body", "").strip()
        twilio_sid = form_data.get("MessageSid", "")

        # 1. Find business by twilio_phone
        print(f"[webhook] From={customer_phone} To={twilio_phone}")
        twilio_digits = re.sub(r'\D', '', twilio_phone)
        all_biz = supabase_service.table("businesses").select("*").execute()
        biz_match = next(
            (b for b in (all_biz.data or [])
             if re.sub(r'\D', '', b.get("twilio_phone") or "") == twilio_digits),
            None
        )
        print(f"[webhook] biz lookup match={'yes' if biz_match else 'no'} (digits={twilio_digits})")
        if not biz_match:
            return

        business = biz_match
        business_id = business["id"]

        # 2. Find or create conversation (check all active statuses)
        convo_result = supabase_service.table("conversations").select("*").eq("business_id", business_id).eq("customer_phone", customer_phone).in_("status", ["ai_handling", "human_takeover", "needs_review"]).execute()

        if convo_result.data:
            conversation = convo_result.data[0]
            conversation_id = conversation["id"]
            conversation_status = conversation["status"]
        else:
            new_convo = supabase_service.table("conversations").insert({
                "business_id": business_id,
                "customer_phone": customer_phone,
                "status": "ai_handling",
            }).execute()
            conversation_id = new_convo.data[0]["id"]
            conversation_status = "ai_handling"

        # 3. Save customer message immediately
        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "customer",
            "body": body,
            "twilio_message_sid": twilio_sid,
        }).execute()

        # 4. Get conversation history
        history_result = supabase_service.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        messages = history_result.data or []

        # 5. Get services for this business
        services_result = supabase_service.table("services").select("*").eq("business_id", business_id).eq("is_active", True).execute()
        services = services_result.data or []

        # 5b. Message cap — stop Gemini being called on runaway conversations
        if len(messages) > 20:
            print(f"[{conversation_id}] Message cap hit — closing conversation")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: send_sms(to=customer_phone, body="Thanks for reaching out! To continue, please text us again anytime. 👍"))
            supabase_service.table("conversations").update({"status": "closed"}).eq("id", conversation_id).execute()
            return

        # 6. If human has taken over — save message but skip AI entirely
        if conversation_status == "human_takeover":
            print(f"[{conversation_id}] Human takeover active — skipping Gemini")
            return

        # 6a. Cancel / Reschedule — handle directly without Gemini if possible
        manage_intent = _detect_manage_intent(body)
        business_hours = business.get("business_hours") or None
        print(f"[{conversation_id}] business_hours = {business_hours}")

        if manage_intent == "cancel":
            print(f"[{conversation_id}] Cancel intent detected")
            reply = await _handle_cancel(customer_phone, business_id, conversation_id)
            supabase_service.table("messages").insert({
                "conversation_id": conversation_id, "sender_type": "ai_agent",
                "body": reply, "ai_confidence": 1.0,
            }).execute()
            supabase_service.table("conversations").update({"last_message_at": "now()"}).eq("id", conversation_id).execute()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: send_sms(to=customer_phone, body=reply))
            return

        if manage_intent == "reschedule":
            print(f"[{conversation_id}] Reschedule intent detected")
            reply = await _handle_reschedule(body, customer_phone, business_id, conversation_id, business_hours=business_hours)
            if reply:
                supabase_service.table("messages").insert({
                    "conversation_id": conversation_id, "sender_type": "ai_agent",
                    "body": reply, "ai_confidence": 1.0,
                }).execute()
                supabase_service.table("conversations").update({"last_message_at": "now()"}).eq("id", conversation_id).execute()
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, lambda: send_sms(to=customer_phone, body=reply))
                return
            # reply is None — slot unavailable or ambiguous, fall through to Gemini
            print(f"[{conversation_id}] Reschedule slot unavailable — falling through to Gemini")

        # 6b. Human-like delay before Gemini reply
        delay = _human_delay(len(body))
        print(f"[{conversation_id}] Waiting {delay:.1f}s before replying...")
        await asyncio.sleep(delay)

        # 6c. Build prompt and call Gemini
        print(f"[{conversation_id}] Calling Gemini with {len(messages)} messages in history...")
        prompt = build_prompt(business=business, services=services, messages=messages)
        ai_response, _ = await generate_response(prompt)
        print(f"[{conversation_id}] Gemini response ({len(ai_response)} chars): {ai_response[:80]}...")

        # 7. Score confidence
        confidence = score_confidence(body, ai_response, services)
        needs_review = confidence <= 0.65
        print(f"[{conversation_id}] Confidence: {confidence} {'— flagging needs_review' if needs_review else ''}")

        if needs_review:
            ai_response = f"Great question — let me have {business.get('name', 'the owner')} follow up with you directly on this one!"

        # 8. Save AI response
        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "ai_agent",
            "body": ai_response,
            "ai_confidence": confidence,
        }).execute()

        # 9. Update conversation — set needs_review if low confidence, else update timestamp
        update_payload = {"last_message_at": "now()"}
        if needs_review:
            update_payload["status"] = "needs_review"
        supabase_service.table("conversations").update(update_payload).eq("id", conversation_id).execute()

        # 10. Send SMS reply
        print(f"[{conversation_id}] Sending SMS to {customer_phone}...")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: send_sms(to=customer_phone, body=ai_response))
        print(f"[{conversation_id}] SMS sent!")

        # 11. Detect booking confirmation and persist to Supabase
        await _detect_and_book(ai_response, messages, customer_phone, conversation_id, business_id, business_hours=business_hours)

    except Exception as e:
        print(f"Webhook error: {e}")


@router.post("/api/webhooks/twilio/inbound")
async def twilio_inbound(request: Request):
    try:
        form = await request.form()
        twilio_sid = form.get("MessageSid", "")

        # Deduplicate — Twilio retries if we don't respond fast enough
        if twilio_sid and twilio_sid in _processed_sids:
            print(f"Duplicate message {twilio_sid}, skipping")
            return Response(content=TWIML_EMPTY, media_type="application/xml")
        if twilio_sid:
            _processed_sids.add(twilio_sid)

        # Fire and forget — return TwiML immediately so Twilio doesn't retry
        asyncio.create_task(_process_message(dict(form)))
    except Exception as e:
        print(f"Twilio inbound error: {e}")
    return Response(content=TWIML_EMPTY, media_type="application/xml")

import asyncio
import re
from datetime import date, timedelta
from fastapi import APIRouter, BackgroundTasks, Request, Response
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

# Debounce — bundle rapid multi-message texts into one Gemini call
_debounce_tasks: dict[str, asyncio.Task] = {}
_DEBOUNCE_SECONDS = 5


def normalize_phone(raw: str) -> str:
    """Normalize any phone format to +1XXX-XXX-XXXX. Falls back to original if not 10/11 digits."""
    digits = re.sub(r'\D', '', raw)
    if digits.startswith('1') and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10:
        return f"+1{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return raw



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


async def _save_incoming(form_data: dict) -> tuple[str | None, dict | None, str | None]:
    """
    Save incoming message to DB immediately. Never loses a message.
    Returns (conversation_id, business, customer_phone) or (None, None, None).
    """
    try:
        customer_phone = normalize_phone(form_data.get("From", ""))
        twilio_phone = form_data.get("To", "")
        body = form_data.get("Body", "").strip()
        twilio_sid = form_data.get("MessageSid", "")

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
            return None, None, None

        business_id = biz_match["id"]

        convo_result = supabase_service.table("conversations").select("*").eq(
            "business_id", business_id
        ).eq("customer_phone", customer_phone).in_(
            "status", ["ai_handling", "human_takeover", "needs_review"]
        ).execute()

        if convo_result.data:
            conversation_id = convo_result.data[0]["id"]
        else:
            new_convo = supabase_service.table("conversations").insert({
                "business_id": business_id,
                "customer_phone": customer_phone,
                "status": "ai_handling",
            }).execute()
            conversation_id = new_convo.data[0]["id"]

        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "customer",
            "body": body,
            "twilio_message_sid": twilio_sid,
        }).execute()

        return conversation_id, biz_match, customer_phone

    except Exception as e:
        print(f"[save_incoming] error: {e}")
        return None, None, None


async def _ai_process(conversation_id: str, business: dict, customer_phone: str):
    """
    Run AI processing for a conversation. Called after debounce fires.
    Reads fresh state from DB — all messages saved during the debounce window are included.
    """
    try:
        business_id = business["id"]

        # Re-read conversation status fresh (may have changed during debounce)
        convo_result = supabase_service.table("conversations").select("*").eq("id", conversation_id).execute()
        if not convo_result.data:
            return
        conversation_status = convo_result.data[0]["status"]

        # Get full conversation history
        history_result = supabase_service.table("messages").select("*").eq(
            "conversation_id", conversation_id
        ).order("created_at").execute()
        messages = history_result.data or []

        # Get services
        services_result = supabase_service.table("services").select("*").eq(
            "business_id", business_id
        ).eq("is_active", True).execute()
        services = services_result.data or []

        # Message cap
        if len(messages) > 20:
            print(f"[{conversation_id}] Message cap hit — closing conversation")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: send_sms(
                to=customer_phone,
                body="Thanks for reaching out! To continue, please text us again anytime. 👍"
            ))
            supabase_service.table("conversations").update({"status": "closed"}).eq("id", conversation_id).execute()
            return

        # Human takeover — skip AI
        if conversation_status == "human_takeover":
            print(f"[{conversation_id}] Human takeover active — skipping Gemini")
            return

        # Use the latest customer message for intent detection
        latest_body = next(
            (m["body"] for m in reversed(messages) if m["sender_type"] == "customer"), ""
        )

        business_hours = business.get("business_hours") or None
        print(f"[{conversation_id}] business_hours = {business_hours}")

        manage_intent = _detect_manage_intent(latest_body)

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
            reply = await _handle_reschedule(latest_body, customer_phone, business_id, conversation_id, business_hours=business_hours)
            if reply:
                supabase_service.table("messages").insert({
                    "conversation_id": conversation_id, "sender_type": "ai_agent",
                    "body": reply, "ai_confidence": 1.0,
                }).execute()
                supabase_service.table("conversations").update({"last_message_at": "now()"}).eq("id", conversation_id).execute()
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, lambda: send_sms(to=customer_phone, body=reply))
                return
            print(f"[{conversation_id}] Reschedule slot unavailable — falling through to Gemini")

        # Call Gemini
        print(f"[{conversation_id}] Calling Gemini with {len(messages)} messages in history...")
        booking_check = supabase_service.table("bookings").select("id").eq("conversation_id", conversation_id).limit(1).execute()
        booking_confirmed = bool(booking_check.data)
        prompt = build_prompt(business=business, services=services, messages=messages, booking_confirmed=booking_confirmed)
        ai_response, _ = await generate_response(prompt)
        print(f"[{conversation_id}] Gemini response ({len(ai_response)} chars): {ai_response[:80]}...")

        confidence = score_confidence(latest_body, ai_response, services)
        needs_review = confidence <= 0.65
        print(f"[{conversation_id}] Confidence: {confidence} {'— flagging needs_review' if needs_review else ''}")

        if needs_review:
            ai_response = f"Great question — let me have {business.get('name', 'the owner')} follow up with you directly on this one!"

        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "ai_agent",
            "body": ai_response,
            "ai_confidence": confidence,
        }).execute()

        update_payload = {"last_message_at": "now()"}
        if needs_review:
            update_payload["status"] = "needs_review"
        supabase_service.table("conversations").update(update_payload).eq("id", conversation_id).execute()

        print(f"[{conversation_id}] Sending SMS to {customer_phone}...")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: send_sms(to=customer_phone, body=ai_response))
        print(f"[{conversation_id}] SMS sent!")

        await _detect_and_book(ai_response, messages, customer_phone, conversation_id, business_id, business_hours=business_hours)

    except Exception as e:
        print(f"[ai_process] error: {e}")


async def _debounced_ai_process(conversation_id: str, business: dict, customer_phone: str):
    """Wait for debounce window then process. Cancelled and restarted if another message arrives."""
    await asyncio.sleep(_DEBOUNCE_SECONDS)
    _debounce_tasks.pop(conversation_id, None)
    await _ai_process(conversation_id, business, customer_phone)


def _send_missed_call_sms(caller_phone: str, business: dict):
    """Create a conversation and send the missed-call opener SMS."""
    try:
        business_id = business["id"]
        agent_name = business.get("agent_name") or "Anna"
        business_name = business.get("name") or "us"

        # Skip if caller already has an active conversation
        existing = supabase_service.table("conversations").select("id").eq(
            "business_id", business_id
        ).eq("customer_phone", caller_phone).in_(
            "status", ["ai_handling", "human_takeover", "needs_review"]
        ).execute()

        if existing.data:
            print(f"[voice] Active convo exists for {caller_phone} — skipping opener")
            return

        # Create conversation
        new_convo = supabase_service.table("conversations").insert({
            "business_id": business_id,
            "customer_phone": caller_phone,
            "status": "ai_handling",
        }).execute()
        conversation_id = new_convo.data[0]["id"]

        opener = (
            f"Hi! We missed your call — I'm {agent_name}, {business_name}'s text assistant. "
            f"How can I help you today? 😊"
        )

        supabase_service.table("messages").insert({
            "conversation_id": conversation_id,
            "sender_type": "ai_agent",
            "body": opener,
            "ai_confidence": 1.0,
        }).execute()

        send_sms(to=caller_phone, body=opener)
        print(f"[voice] Missed-call opener sent to {caller_phone}")

    except Exception as e:
        print(f"[voice] _send_missed_call_sms error: {e}")


@router.post("/api/webhooks/twilio/voice")
async def twilio_voice(request: Request, background_tasks: BackgroundTasks):
    """Handles calls forwarded to Twilio — plays a brief message, hangs up, sends opener SMS."""
    try:
        form = await request.form()
        caller_phone = normalize_phone(form.get("From", ""))
        twilio_phone = form.get("To", "")
        print(f"[voice] Incoming call From={caller_phone} To={twilio_phone}")

        # Look up business by Twilio number
        twilio_digits = re.sub(r'\D', '', twilio_phone)
        all_biz = supabase_service.table("businesses").select("*").execute()
        biz_match = next(
            (b for b in (all_biz.data or [])
             if re.sub(r'\D', '', b.get("twilio_phone") or "") == twilio_digits),
            None
        )

        if not biz_match:
            print(f"[voice] No business found for {twilio_phone}")
            return Response(
                content='<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
                media_type="application/xml"
            )

        business_name = biz_match.get("name") or "us"

        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Response>'
            f'<Say voice="Polly.Joanna">Thanks for calling {business_name}! '
            f'We\'ll follow up with you over text right away.</Say>'
            '<Hangup/>'
            '</Response>'
        )

        background_tasks.add_task(_send_missed_call_sms, caller_phone, biz_match)

        return Response(content=twiml, media_type="application/xml")

    except Exception as e:
        print(f"[voice] webhook error: {e}")
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
            media_type="application/xml"
        )


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

        # Save message immediately — never lose it
        conversation_id, business, customer_phone = await _save_incoming(dict(form))

        if conversation_id and business and customer_phone:
            # Cancel any pending debounce for this conversation and restart the timer.
            # If another message arrives within 5s, the timer resets and Gemini gets
            # called once with all messages bundled together.
            existing = _debounce_tasks.pop(conversation_id, None)
            if existing:
                existing.cancel()
                print(f"[{conversation_id}] Debounce reset — bundling messages")
            _debounce_tasks[conversation_id] = asyncio.create_task(
                _debounced_ai_process(conversation_id, business, customer_phone)
            )

    except Exception as e:
        print(f"Twilio inbound error: {e}")
    return Response(content=TWIML_EMPTY, media_type="application/xml")

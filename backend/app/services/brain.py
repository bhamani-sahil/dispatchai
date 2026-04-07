"""
Brain service — focused tool belt for the business owner.
Handles intents: schedule scan, text customer, generate document, forward message, update price.
Falls back to a simple general response for anything else.
"""

import re


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

def detect_intent(message: str) -> str:
    msg = message.lower()

    # Schedule scan — must check before text_customer (both may contain "schedule")
    schedule_scan_triggers = [
        "scan", "what's on", "whats on", "this week", "upcoming", "schedule",
        "what do i have", "what jobs", "any bookings", "show me bookings",
        "list bookings", "how many jobs", "what's coming", "whats coming",
    ]
    if any(w in msg for w in schedule_scan_triggers) and not re.search(
        r"(text|message|reach out|contact|send).{0,30}(booking|customer|them|the\s+\w+day)", msg
    ):
        return "schedule_scan"

    # Text a specific customer
    text_customer_triggers = [
        r"text the\b", r"text\s+(monday|tuesday|wednesday|thursday|friday|saturday)",
        r"message the\b", r"reach out to the\b",
        r"(text|message|contact)\s+the\s+\w+\s+(booking|customer|job|appointment)",
        r"send (a\s+)?message to\b",
    ]
    if any(re.search(p, msg) for p in text_customer_triggers):
        return "text_customer"

    if any(w in msg for w in ["quote", "invoice", "pdf", "generate", "make a quote", "create a quote",
                               "make an invoice", "create an invoice"]):
        return "generate_document"

    if any(w in msg for w in ["send to", "forward to", "email to", "text to", "send this to"]):
        return "forward"

    if re.search(r"(update|change|set|raise|lower).{0,30}(price|cost|rate|charge)", msg):
        return "pricing_update"

    return "general"


# ---------------------------------------------------------------------------
# Context fetchers
# ---------------------------------------------------------------------------

async def _get_services(business_id: str) -> list[dict]:
    from app.utils.supabase_client import supabase_service
    result = supabase_service.table("services").select("*").eq(
        "business_id", business_id).eq("is_active", True).execute()
    return result.data or []


async def _get_recent_booking(business_id: str) -> dict | None:
    from app.utils.supabase_client import supabase_service
    from datetime import date
    result = supabase_service.table("bookings").select("*").eq(
        "business_id", business_id).gte(
        "slot_date", date.today().isoformat()).order("slot_date").limit(1).execute()
    return result.data[0] if result.data else None


# ---------------------------------------------------------------------------
# Action: Scan the schedule
# ---------------------------------------------------------------------------

async def handle_schedule_scan(business_id: str) -> dict:
    """Return a full schedule summary with missing-info flags."""
    from app.services.calendar_service import get_all_slots

    slots = get_all_slots(business_id)
    booked = [s for s in slots if s.get("booked")]

    if not booked:
        return {"response": "Schedule is clear — no bookings this week.", "bookings": [], "flagged": []}

    lines = []
    flagged = []
    for b in booked:
        label = f"{b['date']} {b['time']}"
        details = []
        missing = []

        phone = b.get("customer_phone", "").strip()
        address = b.get("customer_address", "").strip()
        notes = b.get("notes", "").strip()

        if phone:
            details.append(phone)
        else:
            missing.append("phone")

        if address:
            details.append(address)
        else:
            missing.append("address")

        if notes:
            details.append(f'"{notes}"')

        line = f"• {label}: {' | '.join(details) if details else 'no details recorded'}"
        if missing:
            line += f"  ⚠ missing {', '.join(missing)}"
            flagged.append({"slot": label, "phone": phone or None, "missing": missing})

        lines.append(line)

    count = len(booked)
    response = f"You have {count} booking{'s' if count != 1 else ''} this week:\n\n" + "\n".join(lines)

    if flagged:
        flagged_count = len(flagged)
        response += (
            f"\n\n{flagged_count} booking{'s are' if flagged_count != 1 else ' is'} missing info. "
            "Want me to text those customers to collect the details?"
        )

    return {"response": response, "bookings": booked, "flagged": flagged}


# ---------------------------------------------------------------------------
# Action: Text a specific customer
# ---------------------------------------------------------------------------

async def handle_text_customer(message: str, business_id: str) -> str:
    """Find a booking from natural language hint and send an SMS to that customer."""
    from app.services.calendar_service import get_all_slots
    from app.services.telnyx_service import send_sms

    slots = get_all_slots(business_id)
    booked = [s for s in slots if s.get("booked")]

    if not booked:
        return "No bookings found this week to text."

    msg_lower = message.lower()

    # --- Find which booking ---
    DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    matched = None

    # 1. Match by day name
    for day in DAYS:
        if day in msg_lower:
            for b in booked:
                if day in b.get("date_short", "").lower():
                    # If a time hint also present, narrow further
                    time_hint = re.search(r"(\d{1,2})\s*(am|pm)", msg_lower)
                    if time_hint:
                        hour = time_hint.group(1)
                        meridiem = time_hint.group(2)
                        if hour in b.get("time", "") and meridiem in b.get("time", "").lower():
                            matched = b
                            break
                    else:
                        matched = b
                        break
            if matched:
                break

    # 2. Match by time only
    if not matched:
        time_hint = re.search(r"(\d{1,2})\s*(am|pm)", msg_lower)
        if time_hint:
            hour = time_hint.group(1)
            meridiem = time_hint.group(2)
            for b in booked:
                if hour in b.get("time", "") and meridiem in b.get("time", "").lower():
                    matched = b
                    break

    # 3. Fall back to the next upcoming booking
    if not matched:
        matched = booked[0]

    phone = (matched.get("customer_phone") or "").strip()
    if not phone:
        slot_label = f"{matched['date']} {matched['time']}"
        return f"No phone number on file for the {slot_label} booking — can't send a text."

    # --- Extract what to say ---
    # Patterns: "and ask them X", "and tell them X", "and say X", ": X", "— X"
    content_patterns = [
        r"(?:and\s+)?(?:ask|tell|say|let them know|remind them)\s+(?:them\s+)?(?:that\s+)?(.+)",
        r"[-–:]\s+(.+)",
    ]
    msg_to_send = None
    for pat in content_patterns:
        m = re.search(pat, message, re.I | re.DOTALL)
        if m:
            msg_to_send = m.group(1).strip().rstrip(".")
            break

    slot_label = f"{matched['date']} {matched['time']}"

    if not msg_to_send:
        return (
            f"Found the {slot_label} booking ({phone}). "
            "What would you like me to say? (e.g. 'text them and ask for the gate code')"
        )

    # Capitalise first letter
    msg_to_send = msg_to_send[0].upper() + msg_to_send[1:]

    await send_sms(to=phone, body=msg_to_send)
    return f"✓ Sent to {phone} ({slot_label}):\n\"{msg_to_send}\""


# ---------------------------------------------------------------------------
# Action: Update price
# ---------------------------------------------------------------------------

async def handle_pricing_update(message: str, business_id: str) -> str:
    from app.utils.supabase_client import supabase_service
    services = await _get_services(business_id)
    if not services:
        return "No services found. Add services first via the business settings."

    # Extract price from message
    price_m = re.search(r"\$?(\d+(?:\.\d{1,2})?)", message)
    if not price_m:
        service_list = "\n".join(f"- {s['name']} (${s.get('flat_price') or s.get('price_min','?')})" for s in services)
        return f"What price did you want to set? Your current services:\n{service_list}"

    new_price = float(price_m.group(1))
    msg_lower = message.lower()

    # Find which service is mentioned
    matched = None
    for s in services:
        if s["name"].lower() in msg_lower or any(w in msg_lower for w in s["name"].lower().split()):
            matched = s
            break

    if not matched:
        if len(services) == 1:
            matched = services[0]
        else:
            service_list = "\n".join(f"- {s['name']}" for s in services)
            return f"Which service? Your services:\n{service_list}"

    supabase_service.table("services").update({
        "flat_price": new_price,
        "price_min": None,
        "price_max": None,
    }).eq("id", matched["id"]).eq("business_id", business_id).execute()

    return f"✓ Updated **{matched['name']}** to **${new_price:.2f}**."


# ---------------------------------------------------------------------------
# Action: Parse document request into structured data
# ---------------------------------------------------------------------------

async def handle_generate_document(message: str, business: dict) -> dict:
    """
    Parse owner's natural language into a document payload ready for /api/documents/generate.
    Returns a dict the frontend can use directly, or an error string.
    """
    from app.services.agent import generate_json

    services = await _get_services(business["id"])
    services_text = "\n".join(
        f"- {s['name']}: ${s.get('flat_price') or s.get('price_min','?')}" for s in services
    ) if services else "No services configured."

    # Try to pull recent booking for customer context
    recent = await _get_recent_booking(business["id"])
    booking_context = ""
    if recent:
        booking_context = (
            f"Most recent booking: {recent.get('customer_phone','')} | "
            f"{recent.get('customer_address','')} | {recent.get('job_summary','')}"
        )

    prompt = f"""You are a billing assistant. Extract a quote/invoice from the owner's message.

Business services (use these prices as defaults):
{services_text}

{booking_context}

Owner says: "{message}"

Reply with ONLY valid JSON in this exact format, nothing else:
{{
  "doc_type": "quote" or "invoice",
  "customer": {{"name": "", "phone": "", "address": ""}},
  "line_items": [{{"description": "...", "qty": 1, "unit_price": 0}}],
  "notes": ""
}}

If a price isn't mentioned, use the service default price above. If no match, use 0."""

    raw = await generate_json(prompt)

    # Extract JSON from response
    json_m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_m:
        return {"error": "Couldn't parse document details. Try: 'Quote for John Smith, drain cleaning $150'"}

    import json
    try:
        data = json.loads(json_m.group())
        data["business"] = {
            "name": business["name"],
            "service_area": business.get("service_area", ""),
            "emergency_phone": business.get("emergency_phone", ""),
            "etransfer_email": business.get("etransfer_email", ""),
        }
        return data
    except Exception:
        return {"error": "Couldn't parse. Try: 'Invoice for John, pipe repair $200, labour $80'"}


# ---------------------------------------------------------------------------
# Action: Forward message
# ---------------------------------------------------------------------------

async def handle_forward(message: str, business_id: str) -> str:
    from app.services.telnyx_service import send_sms

    # Extract phone number
    phone_m = re.search(r"\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}", message)
    # Extract email
    email_m = re.search(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", message, re.I)

    # Extract the content to forward (everything after "send to X" or "forward to X")
    content_m = re.search(
        r"(?:send|forward|text|email)\s+(?:this\s+)?(?:to\s+)?[^\s]+\s*[:\-–]?\s*(.+)",
        message, re.I | re.DOTALL
    )
    content = content_m.group(1).strip() if content_m else message

    if phone_m:
        phone = re.sub(r"[\s().+-]", "", phone_m.group())
        if not phone.startswith("+"):
            phone = "+1" + phone[-10:]
        await send_sms(to=phone, body=content)
        return f"✓ Sent via SMS to {phone}."

    if email_m:
        return f"Email forwarding to {email_m.group()} — coming soon (add SendGrid key to enable)."

    return "Couldn't find a phone number or email. Try: 'Send to +14031234567: message here'"


# ---------------------------------------------------------------------------
# Brain prompt builder (for general questions)
# ---------------------------------------------------------------------------

def build_brain_prompt(owner_message: str, business_name: str, schedule_context: str = "", agent_name: str = "Anna") -> str:
    schedule_section = f"\nCurrent schedule:\n{schedule_context}\n" if schedule_context else ""
    return f"""You are {agent_name}, a helpful assistant for {business_name}, a home service business.
The owner is asking a question. Answer concisely in 1-3 sentences.
If you don't know something specific, say so rather than guessing.
{schedule_section}
Owner: {owner_message}
{agent_name}:"""

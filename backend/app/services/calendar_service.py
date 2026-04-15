"""
Calendar service — Supabase-backed.
Slots are generated fresh (next 7 days template).
Bookings are persisted to Supabase so they survive restarts.
"""

from datetime import date, timedelta
from typing import Optional
from app.utils.supabase_client import supabase_service

WEEKDAY_SLOTS = [
    {"time": "8:00-10:00am",   "period": "morning"},
    {"time": "10:00am-12:00pm","period": "morning"},
    {"time": "1:00-3:00pm",    "period": "afternoon"},
    {"time": "3:00-5:00pm",    "period": "afternoon"},
]
SATURDAY_SLOTS = [
    {"time": "9:00-11:00am",   "period": "morning"},
    {"time": "11:00am-1:00pm", "period": "morning"},
]


def _slot_id(date_raw: str, time: str) -> str:
    """Deterministic stable ID from date + time."""
    return f"{date_raw}|{time}"


_DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _generate_template(days_ahead: int = 7, business_hours: dict = None) -> list[dict]:
    """Generate the next N days of slot templates (no booking state).

    If business_hours is provided (dict keyed by lowercase day name), only
    generate slots for days that are open. Sunday is always skipped.
    """
    today = date.today()
    print(f"[calendar] _generate_template called, business_hours keys = {list(business_hours.keys()) if business_hours else None}")
    slots = []
    for i in range(1, days_ahead + 1):
        d = today + timedelta(days=i)
        weekday = d.weekday()
        day_name = _DAY_NAMES[weekday]
        # If business hours provided, skip days that are absent or have no hours (closed)
        if business_hours is not None and not business_hours.get(day_name):
            print(f"[calendar] Skipping {day_name} ({d.isoformat()}) — closed")
            continue
        elif business_hours is None and weekday == 6:
            # No hours config — default Sunday closed
            continue
        times = SATURDAY_SLOTS if weekday == 5 else WEEKDAY_SLOTS
        for s in times:
            slots.append({
                "id": _slot_id(d.isoformat(), s["time"]),
                "date": d.strftime("%A, %B %d"),
                "date_short": d.strftime("%A"),
                "date_raw": d.isoformat(),
                "time": s["time"],
                "period": s["period"],
            })
    return slots


def _normalize_to_template_slot(slot_time: str, slot_date: str) -> str:
    """
    Convert hour-based manual booking times (e.g. "08:00") to template range strings
    (e.g. "8:00-10:00am") so they match the availability template.
    Already-ranged strings (contain '-' or 'am'/'pm') are returned as-is.
    """
    if '-' in slot_time or 'am' in slot_time or 'pm' in slot_time:
        return slot_time
    try:
        hour = int(slot_time.split(':')[0])
        weekday = date.fromisoformat(slot_date).weekday()
        if weekday == 5:  # Saturday
            if hour in (9, 10):  return "9:00-11:00am"
            if hour in (11, 12): return "11:00am-1:00pm"
        else:  # Mon–Fri
            if hour in (8, 9):   return "8:00-10:00am"
            if hour in (10, 11): return "10:00am-12:00pm"
            if hour in (13, 14): return "1:00-3:00pm"
            if hour in (15, 16): return "3:00-5:00pm"
    except (ValueError, IndexError):
        pass
    return slot_time


def _get_booking_counts(business_id: str = None) -> tuple[dict[tuple, int], set[str]]:
    """
    Fetch booking counts per (date, time) slot and all-day blocked dates.
    Returns (counts dict, all_day_dates set).
    """
    today = date.today()
    start = (today + timedelta(days=1)).isoformat()
    end = (today + timedelta(days=7)).isoformat()
    q = supabase_service.table("bookings").select("slot_date,slot_time,status").gte(
        "slot_date", start).lte("slot_date", end).in_("status", ["booked", "completed", "blocked"])
    if business_id:
        q = q.eq("business_id", business_id)
    result = q.execute()

    counts: dict[tuple, int] = {}
    all_day_dates: set[str] = set()
    for b in (result.data or []):
        if b["slot_time"] == "all-day":
            all_day_dates.add(b["slot_date"])
        else:
            normalized = _normalize_to_template_slot(b["slot_time"], b["slot_date"])
            key = (b["slot_date"], normalized)
            counts[key] = counts.get(key, 0) + 1
    return counts, all_day_dates


def _get_max_capacity(business_id: str = None) -> int:
    """Fetch max_bookings_per_slot for this business. Defaults to 1."""
    if not business_id:
        return 1
    result = supabase_service.table("businesses").select("max_bookings_per_slot").eq("id", business_id).execute()
    if result.data:
        return result.data[0].get("max_bookings_per_slot") or 1
    return 1


def get_available_slots(business_id: str = None, business_hours: dict = None) -> list[dict]:
    """Return all slots with remaining capacity for the next 7 days."""
    counts, all_day_dates = _get_booking_counts(business_id)
    max_cap = _get_max_capacity(business_id)
    return [
        s for s in _generate_template(business_hours=business_hours)
        if s["date_raw"] not in all_day_dates
        and counts.get((s["date_raw"], s["time"]), 0) < max_cap
    ]


def get_all_slots(business_id: str = None) -> list[dict]:
    """Return all slots (booked + available) for the next 7 days."""
    today = date.today()
    start = (today + timedelta(days=1)).isoformat()
    end = (today + timedelta(days=7)).isoformat()

    q = supabase_service.table("bookings").select("*").gte(
        "slot_date", start).lte("slot_date", end)
    if business_id:
        q = q.eq("business_id", business_id)
    booked_result = q.execute()

    booked_by_key: dict[tuple, dict] = {}
    for b in (booked_result.data or []):
        booked_by_key[(b["slot_date"], b["slot_time"])] = b

    result = []
    for s in _generate_template():
        key = (s["date_raw"], s["time"])
        if key in booked_by_key:
            b = booked_by_key[key]
            result.append({
                **s,
                "booked": True,
                "customer_phone": b.get("customer_phone", ""),
                "customer_address": b.get("customer_address", ""),
                "notes": b.get("job_summary", ""),
                "status": b.get("status", "booked"),
                "booking_id": b.get("id"),
            })
        else:
            result.append({**s, "booked": False, "status": "available"})

    return result


def book_slot(
    slot_id: str,
    customer_phone: str = "",
    customer_address: str = "",
    notes: str = "",
    business_id: str = None,
    conversation_id: str = None,
) -> Optional[dict]:
    """
    Book a slot. Persists to Supabase.
    slot_id format: "2026-03-26|1:00-3:00pm"
    """
    if "|" not in slot_id:
        return None

    date_raw, time = slot_id.split("|", 1)

    # Check capacity — count existing bookings for this slot vs max allowed
    existing = supabase_service.table("bookings").select("id,slot_time").eq(
        "slot_date", date_raw).in_("status", ["booked", "completed", "blocked"])
    if business_id:
        existing = existing.eq("business_id", business_id)
    existing_rows = existing.execute().data or []
    slot_count = 0
    for row in existing_rows:
        if row["slot_time"] == "all-day":
            return None  # Day is fully blocked
        if row["slot_time"] == time:
            slot_count += 1
    max_cap = _get_max_capacity(business_id)
    if slot_count >= max_cap:
        return None  # Slot at capacity

    # Figure out period
    period = "morning" if any(t in time for t in ["8:00", "9:00", "10:00", "11:00"]) else "afternoon"

    record = {
        "slot_date": date_raw,
        "slot_time": time,
        "period": period,
        "customer_phone": customer_phone,
        "customer_address": customer_address,
        "job_summary": notes,
        "status": "booked",
    }
    if business_id:
        record["business_id"] = business_id
    if conversation_id:
        record["conversation_id"] = conversation_id

    try:
        result = supabase_service.table("bookings").insert(record).execute()
        if not result.data:
            return None
        b = result.data[0]
        # Return in the same shape as a slot dict so callers don't break
        return {
            "id": slot_id,
            "date": date_raw,
            "date_raw": date_raw,
            "time": time,
            "period": period,
            "booked": True,
            "customer_phone": customer_phone,
            "customer_address": customer_address,
            "notes": notes,
            "status": "booked",
            "booking_id": b.get("id"),
        }
    except Exception as e:
        print(f"book_slot error: {e}")
        return None


def find_and_book(
    day_hint: str,
    time_hint: str,
    customer_phone: str = "",
    customer_address: str = "",
    notes: str = "",
    business_id: str = None,
    business_hours: dict = None,
) -> Optional[dict]:
    """Find best matching available slot and book it."""
    import re
    day_hint = day_hint.lower()
    time_hint = time_hint.lower()
    is_morning = any(w in time_hint for w in ["morning", "before noon", "early"])
    is_afternoon = any(w in time_hint for w in ["afternoon", "after noon"])
    hour_match = re.search(r"(\d{1,2})(?::\d{2})?\s*(am|pm)", time_hint)
    if hour_match:
        hour, meridiem = int(hour_match.group(1)), hour_match.group(2)
        is_morning = meridiem == "am"
        is_afternoon = meridiem == "pm" and hour != 12
    for slot in get_available_slots(business_id, business_hours=business_hours):
        if day_hint not in slot["date_short"].lower():
            continue
        if is_morning and slot["period"] != "morning":
            continue
        if is_afternoon and slot["period"] != "afternoon":
            continue
        return book_slot(slot["id"], customer_phone, customer_address, notes, business_id)
    return None


def format_slots_for_prompt(business_id: str = None, business_hours: dict = None) -> str:
    available = get_available_slots(business_id, business_hours=business_hours)
    if not available:
        return "No availability this week — customer must call the emergency line."
    by_day: dict[str, list[str]] = {}
    for s in available:
        by_day.setdefault(s["date"], []).append(s["time"])
    return "\n".join(f"- {date}: {', '.join(times)}" for date, times in by_day.items())

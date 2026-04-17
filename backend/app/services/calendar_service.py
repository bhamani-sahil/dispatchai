"""
Calendar service — Supabase-backed.
Slots are generated fresh (next 7 days template).
Bookings are persisted to Supabase so they survive restarts.
"""

import re
from datetime import date, timedelta
from typing import Optional
from app.utils.supabase_client import supabase_service
from app.utils.tz import business_today

SLOT_MINUTES = 90  # 1.5-hour booking blocks

DEFAULT_HOURS = {
    "monday":    {"open": "08:00", "close": "17:00"},
    "tuesday":   {"open": "08:00", "close": "17:00"},
    "wednesday": {"open": "08:00", "close": "17:00"},
    "thursday":  {"open": "08:00", "close": "17:00"},
    "friday":    {"open": "08:00", "close": "17:00"},
    "saturday":  {"open": "09:00", "close": "13:00"},
    "sunday":    None,
}


def _slot_id(date_raw: str, time: str) -> str:
    """Deterministic stable ID from date + time."""
    return f"{date_raw}|{time}"


_DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _resolve_hours(business_hours: dict | None) -> dict:
    return business_hours if business_hours is not None else DEFAULT_HOURS


def _parse_hhmm(s: str) -> int:
    """'HH:MM' -> minutes-of-day."""
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def _fmt_clock(minutes: int) -> tuple[str, str]:
    """Return (time_str, meridiem). 90 -> ('1:30', 'am'), 780 -> ('1:00', 'pm')."""
    h, m = divmod(minutes, 60)
    meridiem = "am" if h < 12 else "pm"
    h12 = h % 12 or 12
    return (f"{h12}:{m:02d}" if m else f"{h12}:00", meridiem)


def _slot_label(start_min: int, end_min: int) -> str:
    """'8:00-9:30am' or '11:00am-12:30pm' (cross-meridiem)."""
    s_t, s_mer = _fmt_clock(start_min)
    e_t, e_mer = _fmt_clock(end_min)
    return f"{s_t}-{e_t}{e_mer}" if s_mer == e_mer else f"{s_t}{s_mer}-{e_t}{e_mer}"


def _slots_for_window(open_str: str, close_str: str) -> list[dict]:
    """Slice an open-close window into SLOT_MINUTES blocks."""
    start = _parse_hhmm(open_str)
    end = _parse_hhmm(close_str)
    out = []
    cur = start
    while cur + SLOT_MINUTES <= end:
        nxt = cur + SLOT_MINUTES
        out.append({
            "time": _slot_label(cur, nxt),
            "period": "morning" if cur < 12 * 60 else "afternoon",
            "start_min": cur,
            "end_min": nxt,
        })
        cur = nxt
    return out


def _generate_template(days_ahead: int = 7, business_hours: dict = None, tz: str = None) -> list[dict]:
    """Generate the next N days of slot templates from configured hours."""
    today = business_today(tz)
    hours = _resolve_hours(business_hours)
    slots = []
    for i in range(1, days_ahead + 1):
        d = today + timedelta(days=i)
        day_name = _DAY_NAMES[d.weekday()]
        window = hours.get(day_name)
        if not window:
            continue
        for s in _slots_for_window(window["open"], window["close"]):
            slots.append({
                "id": _slot_id(d.isoformat(), s["time"]),
                "date": d.strftime("%A, %B %d"),
                "date_short": d.strftime("%A"),
                "date_raw": d.isoformat(),
                "time": s["time"],
                "period": s["period"],
            })
    return slots


def _normalize_to_template_slot(slot_time: str, slot_date: str, business_hours: dict = None) -> str:
    """
    Convert hour-based manual booking times (e.g. '09:00') to the matching
    1.5h block label. Labeled slots pass through unchanged.
    """
    low = slot_time.lower()
    if '-' in slot_time and ('am' in low or 'pm' in low):
        return slot_time
    try:
        start_min = _parse_hhmm(slot_time)
        day_name = _DAY_NAMES[date.fromisoformat(slot_date).weekday()]
        window = _resolve_hours(business_hours).get(day_name)
        if not window:
            return slot_time
        for s in _slots_for_window(window["open"], window["close"]):
            if s["start_min"] <= start_min < s["end_min"]:
                return s["time"]
    except Exception:
        pass
    return slot_time


def _get_booking_counts(business_id: str = None, business_hours: dict = None, tz: str = None) -> tuple[dict[tuple, int], set[str]]:
    """
    Fetch booking counts per (date, time) slot and all-day blocked dates.
    Returns (counts dict, all_day_dates set).
    """
    today = business_today(tz)
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
            normalized = _normalize_to_template_slot(b["slot_time"], b["slot_date"], business_hours)
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


def get_available_slots(business_id: str = None, business_hours: dict = None, tz: str = None) -> list[dict]:
    """Return all slots with remaining capacity for the next 7 days."""
    counts, all_day_dates = _get_booking_counts(business_id, business_hours=business_hours, tz=tz)
    max_cap = _get_max_capacity(business_id)
    return [
        s for s in _generate_template(business_hours=business_hours, tz=tz)
        if s["date_raw"] not in all_day_dates
        and counts.get((s["date_raw"], s["time"]), 0) < max_cap
    ]


def get_all_slots(business_id: str = None, business_hours: dict = None, tz: str = None) -> list[dict]:
    """Return all slots (booked + available) for the next 7 days."""
    today = business_today(tz)
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
    for s in _generate_template(business_hours=business_hours, tz=tz):
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

    # Figure out period — morning if the FIRST am/pm in the label is 'am'
    first_mer = re.search(r"(am|pm)", time.lower())
    period = "morning" if first_mer and first_mer.group(1) == "am" else "afternoon"

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
    tz: str = None,
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
    for slot in get_available_slots(business_id, business_hours=business_hours, tz=tz):
        if day_hint not in slot["date_short"].lower():
            continue
        if is_morning and slot["period"] != "morning":
            continue
        if is_afternoon and slot["period"] != "afternoon":
            continue
        return book_slot(slot["id"], customer_phone, customer_address, notes, business_id)
    return None


def format_slots_for_prompt(business_id: str = None, business_hours: dict = None, tz: str = None) -> str:
    available = get_available_slots(business_id, business_hours=business_hours, tz=tz)
    if not available:
        return "No availability this week — customer must call the emergency line."
    by_day: dict[str, list[str]] = {}
    for s in available:
        by_day.setdefault(s["date"], []).append(s["time"])
    return "\n".join(f"- {date}: {', '.join(times)}" for date, times in by_day.items())

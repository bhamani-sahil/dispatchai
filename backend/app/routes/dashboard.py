import re
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from app.utils.supabase_client import supabase_anon, supabase_service
from app.utils.tz import business_today, business_tz

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


def _period_range(period: str, tz: str = None) -> tuple[str, str]:
    today = business_today(tz)
    if period == "today":
        return today.isoformat(), today.isoformat()
    elif period == "this_week":
        start = today - timedelta(days=today.weekday())
        return start.isoformat(), today.isoformat()
    elif period == "this_month":
        start = today.replace(day=1)
        return start.isoformat(), today.isoformat()
    else:  # all_time
        return "2000-01-01", today.isoformat()


@router.get("/api/dashboard")
async def dashboard(
    period: str = Query("this_week", regex="^(today|this_week|this_month|all_time)$"),
    user=Depends(get_current_user),
):
    business = await get_user_business(user.id)
    business_id = business["id"]
    tz = business_tz(business)
    start_date, end_date = _period_range(period, tz=tz)

    # --- Conversations ---
    all_convs = supabase_service.table("conversations").select(
        "id, status, created_at"
    ).eq("business_id", business_id).execute()
    convs = all_convs.data or []

    period_convs = [
        c for c in convs
        if start_date <= c["created_at"][:10] <= end_date
    ]

    total_conversations = len(period_convs)
    active_conversations = sum(1 for c in convs if c["status"] in ("ai_handling", "human_takeover"))
    needs_review_count = sum(1 for c in convs if c["status"] == "needs_review")

    # --- Bookings ---
    all_bookings = supabase_service.table("bookings").select(
        "id, slot_date, slot_time, customer_phone, customer_address, job_summary, status, created_at"
    ).eq("business_id", business_id).execute()
    bookings = all_bookings.data or []

    period_bookings = [
        b for b in bookings
        if start_date <= b["created_at"][:10] <= end_date
        and b["status"] != "blocked"
    ]
    total_bookings = len(period_bookings)

    # --- Conversion rate (AI Score) — capped at 100 ---
    conversion_rate = round(min(100, (total_bookings / total_conversations * 100) if total_conversations else 0), 1)

    # --- Revenue converted (sum of document totals for completed/sent) ---
    docs = supabase_service.table("documents").select("total, status, created_at").eq(
        "business_id", business_id
    ).in_("status", ["sent", "paid"]).execute()
    revenue_converted = sum(
        d["total"] for d in (docs.data or [])
        if start_date <= d["created_at"][:10] <= end_date
    )

    # --- Time saved: AI messages × 2 min / 60 ---
    conv_ids = {c["id"] for c in convs}
    if conv_ids:
        msgs = supabase_service.table("messages").select("id, created_at").eq(
            "sender_type", "ai_agent"
        ).in_("conversation_id", list(conv_ids)).execute()
        ai_msg_count = len([
            m for m in (msgs.data or [])
            if start_date <= m["created_at"][:10] <= end_date
        ])
    else:
        ai_msg_count = 0
    time_saved_hours = round(ai_msg_count * 2 / 60, 1)

    # --- Upcoming jobs (next 5) ---
    today_str = business_today(tz).isoformat()
    upcoming_jobs = [
        b for b in sorted(bookings, key=lambda x: (x["slot_date"], x["slot_time"] or ""))
        if b["slot_date"] >= today_str
        and b["status"] not in ("cancelled", "blocked")
        and b.get("customer_phone")
    ][:5]

    # --- Recent activity feed ---
    activity = []
    for c in sorted(convs, key=lambda x: x["created_at"], reverse=True)[:5]:
        activity.append({
            "type": "conversation",
            "label": f"New conversation",
            "status": c["status"],
            "time": c["created_at"],
        })
    for b in sorted(bookings, key=lambda x: x["created_at"], reverse=True)[:8]:
        is_blocked = b["status"] == "blocked"
        activity.append({
            "type": "blocked" if is_blocked else "booking",
            "label": f"Blocked: {b['slot_date']} {b['slot_time'] or ''}" if is_blocked else f"Booking: {b['slot_date']} {b['slot_time'] or ''}",
            "status": b["status"],
            "time": b["created_at"],
        })
    activity.sort(key=lambda x: x["time"], reverse=True)
    activity = activity[:10]

    return {
        "period": period,
        "revenue_converted": revenue_converted,
        "total_bookings": total_bookings,
        "total_conversations": total_conversations,
        "conversion_rate": conversion_rate,
        "active_conversations": active_conversations,
        "needs_review_count": needs_review_count,
        "time_saved_hours": time_saved_hours,
        "agent_active": business["agent_active"] if business.get("agent_active") is not None else True,
        "upcoming_jobs": upcoming_jobs,
        "recent_activity": activity,
    }


class AgentToggleBody(BaseModel):
    active: bool | None = None


@router.put("/api/dashboard/agent-toggle")
async def toggle_agent(body: AgentToggleBody = AgentToggleBody(), user=Depends(get_current_user)):
    """Toggle the AI agent on/off for this business."""
    business = await get_user_business(user.id)
    current = business.get("agent_active")
    current = current if current is not None else True
    new_state = body.active if body.active is not None else not current
    supabase_service.table("businesses").update({"agent_active": new_state}).eq("id", business["id"]).execute()
    return {"agent_active": new_state}


@router.get("/api/calendar/bookings")
async def get_bookings(user=Depends(get_current_user)):
    """Get all bookings for the authenticated business."""
    business = await get_user_business(user.id)
    result = supabase_service.table("bookings").select(
        "id, slot_date, slot_time, period, customer_phone, customer_address, job_summary, status"
    ).eq("business_id", business["id"]).in_("status", ["booked", "completed", "blocked", "assigned"]).order("slot_date").execute()
    return result.data or []


class CreateBookingRequest(BaseModel):
    slot_id: str           # "2026-03-28|1:00-3:00pm"
    customer_phone: str = ""
    customer_address: str = ""
    customer_name: str = ""
    notes: str = ""


@router.get("/api/calendar/all-slots")
async def get_all_slots_auth(user=Depends(get_current_user)):
    """All slots (booked + available) for the next 7 days — authenticated."""
    business = await get_user_business(user.id)
    from app.services.calendar_service import get_all_slots
    return get_all_slots(
        business["id"],
        business_hours=business.get("business_hours") or None,
        tz=business_tz(business),
    )


@router.post("/api/calendar/book", status_code=201)
async def create_booking_manual(body: CreateBookingRequest, user=Depends(get_current_user)):
    """Manually create a booking from the scheduler UI."""
    business = await get_user_business(user.id)
    from app.services.calendar_service import book_slot
    result = book_slot(
        slot_id=body.slot_id,
        customer_phone=body.customer_phone,
        customer_address=body.customer_address,
        notes=body.notes or body.customer_name,
        business_id=business["id"],
    )
    if not result:
        raise HTTPException(status_code=409, detail="Slot already booked or invalid")
    return result


class ManualBookingRequest(BaseModel):
    customer_phone: str | None = None
    slot_date: str = ""
    slot_time: str = ""
    period: str = "morning"
    customer_address: str | None = None
    job_summary: str | None = None
    status: str = "booked"


@router.post("/api/calendar/bookings", status_code=201)
async def create_booking_direct(body: ManualBookingRequest, user=Depends(get_current_user)):
    """Create a booking or block directly — manual entry from mobile app."""
    business = await get_user_business(user.id)
    VALID_STATUSES = {"booked", "assigned", "completed", "cancelled", "no_show", "blocked"}
    status = body.status if body.status in VALID_STATUSES else "booked"
    job_summary = (body.job_summary or "").strip() or None
    row = {
        "business_id": business["id"],
        "customer_phone": (body.customer_phone or "").strip() or None,
        "slot_date": body.slot_date.strip(),
        "slot_time": body.slot_time.strip(),
        "period": body.period,
        "customer_address": (body.customer_address or "").strip() or None,
        "job_summary": job_summary,
        "status": status,
    }
    result = supabase_service.table("bookings").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create booking")
    return result.data[0]


class ForwardTechRequest(BaseModel):
    booking_id: str
    tech_phone: str
    message: str = ""


@router.post("/api/calendar/forward-tech")
async def forward_to_tech(body: ForwardTechRequest, user=Depends(get_current_user)):
    """Send job details to a tech via SMS."""
    business = await get_user_business(user.id)
    result = supabase_service.table("bookings").select("*").eq(
        "id", body.booking_id
    ).eq("business_id", business["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    b = result.data[0]

    summary = b.get('job_summary') or b.get('notes') or 'No summary'
    print(f"[forward-tech] job_summary='{b.get('job_summary')}' notes='{b.get('notes')}'")
    msg = body.message or (
        f"Job: {b['slot_date']} {b['slot_time']}\n"
        f"Customer: {b.get('customer_phone','?')}\n"
        f"Address: {b.get('customer_address') or 'No address'}\n"
        f"Summary: {summary}\n"
        f"- {business['name']}"
    )

    from app.services.twilio_service import send_sms
    to = body.tech_phone
    if not to.startswith("+"):
        to = "+1" + re.sub(r"\D", "", to)[-10:]

    sms_ok = True
    try:
        send_sms(to=to, body=msg)
    except Exception as e:
        print(f"[forward-tech] SMS failed (continuing): {e}")
        sms_ok = False

    # Always mark as assigned regardless of SMS status
    supabase_service.table("bookings").update({"status": "assigned"}).eq(
        "id", body.booking_id
    ).execute()

    return {"sent": True, "to": to, "sms_delivered": sms_ok}


class BookingStatusUpdate(BaseModel):
    status: str


@router.put("/api/calendar/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, body: BookingStatusUpdate, user=Depends(get_current_user)):
    """Cancel, complete, or mark no-show on a booking."""
    status = body.status
    if status not in ("cancelled", "completed", "no_show", "booked"):
        raise HTTPException(status_code=400, detail="Invalid status")
    business = await get_user_business(user.id)
    result = supabase_service.table("bookings").update({"status": status}).eq(
        "id", booking_id
    ).eq("business_id", business["id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"ok": True, "status": status}


@router.delete("/api/calendar/bookings/{booking_id}", status_code=200)
async def delete_blocked_slot(booking_id: str, user=Depends(get_current_user)):
    """Delete a blocked slot when marked as available — removes the placeholder row."""
    business = await get_user_business(user.id)
    # Only allow deleting blocked entries for safety
    check = supabase_service.table("bookings").select("id, status").eq(
        "id", booking_id
    ).eq("business_id", business["id"]).limit(1).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if check.data[0]["status"] != "blocked":
        raise HTTPException(status_code=400, detail="Only blocked slots can be deleted this way")
    supabase_service.table("bookings").delete().eq("id", booking_id).execute()
    return {"ok": True}

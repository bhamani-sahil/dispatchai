"""
Vapi voice-tool endpoints.

Vapi calls these during a live voice conversation (function/tool calling).
Each endpoint receives Vapi's tool-call payload and must respond with:
  {"results": [{"toolCallId": "...", "result": "<string Anna reads>"}]}

For the demo, the caller's business is resolved via VAPI_TEST_BUSINESS_ID
(env var) or falls back to the first business row. Later we'll route
per-call using the destination phone number.
"""
import json
import os
from fastapi import APIRouter, Request
from app.utils.supabase_client import supabase_service
from app.services.calendar_service import get_available_slots, find_and_book
from app.utils.tz import business_tz

router = APIRouter(prefix="/api/voice/tools")


def _resolve_business() -> dict | None:
    test_id = os.environ.get("VAPI_TEST_BUSINESS_ID")
    if test_id:
        r = supabase_service.table("businesses").select("*").eq("id", test_id).execute()
        if r.data:
            return r.data[0]
    r = supabase_service.table("businesses").select("*").limit(1).execute()
    return r.data[0] if r.data else None


def _tool_response(tool_call_id: str, result: str) -> dict:
    return {"results": [{"toolCallId": tool_call_id, "result": result}]}


def _extract(payload: dict) -> tuple[str, dict, str]:
    """Return (toolCallId, args, caller_phone)."""
    msg = payload.get("message", {})
    tool_calls = msg.get("toolCalls") or msg.get("toolCallList") or []
    if not tool_calls:
        return "", {}, ""
    tc = tool_calls[0]
    tc_id = tc.get("id", "")
    args = tc.get("function", {}).get("arguments", {})
    if isinstance(args, str):
        try:
            args = json.loads(args) if args else {}
        except Exception:
            args = {}
    call = msg.get("call") or {}
    caller_phone = (call.get("customer") or {}).get("number") or ""
    return tc_id, args, caller_phone


@router.post("/get-slots")
async def get_slots(request: Request):
    payload = await request.json()
    tc_id, _, _ = _extract(payload)
    biz = _resolve_business()
    if not biz:
        return _tool_response(tc_id, "No business configured yet.")
    all_slots = get_available_slots(
        business_id=biz["id"],
        business_hours=biz.get("business_hours"),
        tz=business_tz(biz),
    )
    # Compact voice-friendly output — next 3 days, up to 2 slots per day
    by_day: dict[str, list[str]] = {}
    day_order: list[str] = []
    for s in all_slots:
        d = s["date"]
        if d not in by_day:
            if len(day_order) >= 3:
                continue
            day_order.append(d)
            by_day[d] = []
        if len(by_day[d]) < 2:
            by_day[d].append(s["time"])
    if not by_day:
        result = "No availability in the next week."
    else:
        result = "; ".join(f"{d}: {', '.join(times)}" for d, times in by_day.items())
    print(f"[voice-tool get-slots] biz={biz['id']} result={result}")
    return _tool_response(tc_id, result)


@router.post("/book-slot")
async def book_slot_tool(request: Request):
    payload = await request.json()
    tc_id, args, caller_phone = _extract(payload)
    biz = _resolve_business()
    if not biz:
        return _tool_response(tc_id, "No business configured — cannot book.")

    day = (args.get("day") or args.get("day_of_week") or "").strip()
    time_hint = (args.get("time") or args.get("time_slot") or "").strip()
    address = (args.get("address") or "").strip()
    notes = (args.get("notes") or args.get("job_summary") or "Voice booking").strip()
    phone = args.get("customer_phone") or caller_phone or ""

    print(f"[voice-tool book-slot] day={day} time={time_hint} phone={phone}")

    if not day:
        return _tool_response(tc_id, "Need a day first — ask which day works.")

    result = find_and_book(
        day_hint=day,
        time_hint=time_hint or "any",
        customer_phone=phone,
        customer_address=address,
        notes=notes,
        business_id=biz["id"],
        business_hours=biz.get("business_hours"),
        tz=business_tz(biz),
    )

    if not result:
        return _tool_response(
            tc_id,
            f"No availability on {day}. Offer an alternative day or time."
        )

    return _tool_response(
        tc_id,
        f"Booked! {result['date']} at {result['time']}. Confirm with the customer."
    )

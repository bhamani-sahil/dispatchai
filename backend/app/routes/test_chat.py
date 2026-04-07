from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from app.services.agent import generate_response, summarize_booking, score_confidence
from app.services.prompt_builder import build_prompt
from app.services.calendar_service import find_and_book, get_all_slots

router = APIRouter()

_test_history: list[dict] = []
_test_context = {"phone": "", "address": "", "booked": False, "business_id": ""}

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]


def _extract_context(text: str):
    """Pull phone/address hints from customer messages. Scans current message."""
    import re
    # Phone: 10-digit, formatted, or with country code
    phone_match = re.search(
        r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", text
    )
    if phone_match:
        raw = re.sub(r"[^\d]", "", phone_match.group())
        if len(raw) >= 10:
            _test_context["phone"] = raw[-10:]

    # Address: street number + words + street type + optional quadrant
    addr_match = re.search(
        r"\b\d{1,6}(?:\s+\w+){1,5}\s+"
        r"(?:drive|dr|avenue|ave|street|st|boulevard|blvd|way|road|rd|"
        r"terrace|terr|crescent|cres|court|ct|close|place|pl|lane|ln|"
        r"highway|hwy|nw|ne|sw|se)\b"
        r"(?:\s+(?:nw|ne|sw|se|north|south|east|west))?",
        text, re.I
    )
    if addr_match:
        _test_context["address"] = addr_match.group().strip()
    # Also scan full history for address if not yet found
    if not _test_context["address"]:
        for m in _test_history:
            if m.get("sender_type") == "customer":
                h = re.search(
                    r"\b\d{1,6}(?:\s+\w+){1,5}\s+"
                    r"(?:drive|dr|avenue|ave|street|st|boulevard|blvd|way|road|rd|"
                    r"terrace|terr|crescent|cres|court|ct|close|place|pl|lane|ln|"
                    r"highway|hwy|nw|ne|sw|se)\b"
                    r"(?:\s+(?:nw|ne|sw|se|north|south|east|west))?",
                    m["body"], re.I
                )
                if h:
                    _test_context["address"] = h.group().strip()
                    break


async def _detect_and_book(ai_text: str, history: list[dict]) -> dict | None:
    """If AI confirmed a booking, summarize and book the matching slot. Only fires once per conversation."""
    if _test_context["booked"]:
        return None
    text = ai_text.lower()
    booking_signals = [
        "booked!", "booked ✓", "you're booked", "you are booked", "all booked",
        "confirmed for", "see you monday", "see you tuesday", "see you wednesday",
        "see you thursday", "see you friday", "see you saturday",
        "we'll see you", "we will see you", "appointment is set", "appointment's set",
    ]
    if not any(w in text for w in booking_signals):
        return None

    import re as _re
    from app.services.calendar_service import get_available_slots, book_slot

    for day in DAYS:
        if day not in text:
            continue
        day_slots = [s for s in get_available_slots() if s["date_short"].lower() == day]
        if not day_slots:
            continue

        # Port _best_slot_match from webhooks.py — handles "3-5pm", "3:00-5:00pm", "3pm", etc.
        def _best_match(slots, t):
            time_mentions = set()
            for m in _re.finditer(r"\b(\d{1,2}):\d{2}\s*(am|pm)?\s*[-\u2013]\s*\d{1,2}:\d{2}\s*(am|pm)\b", t):
                mer = m.group(2) if m.group(2) else m.group(3)
                time_mentions.add((int(m.group(1)), mer))
            for m in _re.finditer(r"\b(\d{1,2})\s*[-\u2013]\s*\d{1,2}\s*(am|pm)\b", t):
                time_mentions.add((int(m.group(1)), m.group(2)))
            for m in _re.finditer(r"\b(\d{1,2})(?::\d{2})?\s*(am|pm)\b", t):
                time_mentions.add((int(m.group(1)), m.group(2)))
            for slot in slots:
                hm = _re.match(r"(\d{1,2})", slot["time"])
                mm = _re.search(r"(am|pm)", slot["time"], _re.I)
                if hm and mm and (int(hm.group(1)), mm.group(1).lower()) in time_mentions:
                    return slot
            return slots[0]

        chosen = _best_match(day_slots, text)
        notes = await summarize_booking(history)
        business_id = _test_context.get("business_id")
        booked = book_slot(chosen["id"], _test_context["phone"], _test_context["address"], notes, business_id)
        if booked:
            _test_context["booked"] = True
        return booked
    return None


AGENT_NAMES = {
    "plumbing": "Test Plumbing Co",
    "hvac": "Test HVAC Co",
    "auto_detailing": "Test Auto Detailing",
    "junk_removal": "Test Junk Removal",
    "garage_door_repair": "Test Garage Door Repair",
    "pet_grooming": "Test Pet Grooming",
    "general_handyman": "Test Handyman Co",
    "electrical": "Test Electrical Co",
    "locksmith": "Test Locksmith Co",
    "car_repair": "Test Auto Repair",
    "carpet_cleaning": "Test Carpet Cleaning",
    "pressure_washing": "Test Pressure Washing",
    "landscaping": "Test Landscaping Co",
    "appliance_repair": "Test Appliance Repair",
    "door_repair": "Test Door Repair",
}


class TestMessage(BaseModel):
    message: str
    reset: bool = False
    agent_type: str = "plumbing"
    custom_instructions: str = ""
    business_id: str = ""


@router.post("/api/test/chat")
async def test_chat(payload: TestMessage):
    global _test_history, _test_context

    if payload.reset:
        _test_history = []
        _test_context = {"phone": "", "address": "", "booked": False, "business_id": payload.business_id or ""}
        return {"response": "", "reset": True}

    # Store business_id whenever provided
    if payload.business_id:
        _test_context["business_id"] = payload.business_id

    _extract_context(payload.message)
    _test_history.append({"sender_type": "customer", "body": payload.message})

    prompt = build_prompt(
        business={
            "name": AGENT_NAMES.get(payload.agent_type, "Test Business"),
            "agent_type": payload.agent_type,
            "emergency_phone": "+14031234567",
            "service_area": "Calgary NW",
            "business_hours": {},
            "custom_instructions": payload.custom_instructions or None,
        },
        services=[],
        messages=_test_history,
    )

    ai_response, _ = await generate_response(prompt)
    confidence = score_confidence(payload.message, ai_response, [])
    needs_review = confidence <= 0.65

    if needs_review:
        ai_response = f"Great question — let me have the owner follow up with you directly on this one!"

    _test_history.append({"sender_type": "ai_agent", "body": ai_response})
    booked_slot = await _detect_and_book(ai_response, _test_history)

    return {
        "response": ai_response,
        "confidence": confidence,
        "needs_review": needs_review,
        "char_count": len(ai_response),
        "turn": len([m for m in _test_history if m["sender_type"] == "customer"]),
        "booked_slot": booked_slot,
    }


@router.get("/api/gemini/usage")
async def gemini_usage():
    from app.services.agent import get_usage
    return get_usage()


@router.get("/api/calendar/slots")
async def calendar_slots():
    return get_all_slots()


class OwnerMessage(BaseModel):
    message: str


@router.post("/api/test/owner-message")
async def owner_message(payload: OwnerMessage):
    """Inject an owner/human reply into conversation history so AI has context when it resumes."""
    _test_history.append({"sender_type": "owner", "body": payload.message})
    return {"ok": True, "turn": len(_test_history)}


class SharePayload(BaseModel):
    to: str
    message: str


@router.post("/api/calendar/share")
async def calendar_share(payload: SharePayload):
    from app.services.telnyx_service import send_sms
    await send_sms(to=payload.to, body=payload.message)
    return {"ok": True}


@router.get("/test", response_class=HTMLResponse)
async def test_ui():
    return """<!DOCTYPE html>
<!-- SMS Test UI — visit /calendar to see bookings -->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Anna — SMS Test</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .phone { width: 375px; height: 700px; background: #fff; border-radius: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; border: 8px solid #1a1a1a; }
  .header { background: #1a1a1a; color: #fff; padding: 16px 20px; text-align: center; }
  .header h2 { font-size: 16px; font-weight: 600; }
  .header p { font-size: 11px; color: #888; margin-top: 2px; }
  .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #f8f8f8; }
  .bubble { max-width: 80%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; position: relative; }
  .bubble.customer { background: #007AFF; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
  .bubble.anna { background: #e5e5ea; color: #000; align-self: flex-start; border-bottom-left-radius: 4px; }
  .bubble .meta { font-size: 10px; opacity: 0.6; margin-top: 4px; }
  .bubble.anna .meta { color: #555; }
  .bubble.customer .meta { color: rgba(255,255,255,0.7); text-align: right; }
  .input-area { padding: 12px; background: #fff; border-top: 1px solid #e0e0e0; display: flex; gap: 8px; align-items: flex-end; }
  textarea { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; resize: none; outline: none; font-family: inherit; max-height: 80px; }
  button { background: #007AFF; color: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  button:disabled { background: #ccc; }
  .reset-btn { background: none; border: none; color: #ff3b30; font-size: 12px; cursor: pointer; text-align: center; padding: 6px; width: 33%; border-radius: 0; height: auto; }
  .cal-btn { background: none; border: none; color: #007AFF; font-size: 12px; cursor: pointer; text-align: center; padding: 6px; width: 33%; border-radius: 0; height: auto; }
  .bottom-bar { display: flex; border-top: 1px solid #e0e0e0; }
  .agent-select { width: 34%; border: none; border-left: 1px solid #e0e0e0; font-size: 11px; color: #555; padding: 6px 4px; background: none; outline: none; cursor: pointer; }
  .booked-toast { background: #e8f5e9; color: #2e7d32; font-size: 12px; padding: 8px 14px; text-align: center; display: none; }
  .takeover-banner { background: #fff3e0; color: #e65100; font-size: 11px; font-weight: 700; padding: 6px 14px; text-align: center; display: none; border-top: 1px solid #ffe0b2; }
  .bubble.owner { background: #2e7d32; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
  .bubble.owner .meta { color: rgba(255,255,255,0.7); text-align: right; }
  .typing { display: none; align-self: flex-start; background: #e5e5ea; border-radius: 18px; border-bottom-left-radius: 4px; padding: 12px 16px; }
  .typing span { display: inline-block; width: 6px; height: 6px; background: #888; border-radius: 50%; margin: 0 2px; animation: bounce 1.2s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
  .custom-instructions { padding: 8px 12px; border-top: 1px solid #e0e0e0; background: #fafafa; }
  .custom-instructions textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 6px 10px; font-size: 11px; resize: none; outline: none; font-family: inherit; color: #444; background: #fff; }
  .custom-instructions label { font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="phone">
  <div class="header">
    <h2 id="header-title">Anna — Test Business</h2>
    <p>SMS simulator — not a real message</p>
    <p id="usage-badge" style="font-size:10px;color:#888;margin-top:4px;">Loading usage...</p>
  </div>
  <div class="messages" id="messages">
    <div class="bubble anna">Hey! Send a message to start the conversation.</div>
  </div>
  <div id="typing" class="typing" style="display:none; margin: 0 16px 8px;">
    <span></span><span></span><span></span>
  </div>
  <div class="input-area">
    <textarea id="input" placeholder="iMessage" rows="1" onkeydown="handleKey(event)"></textarea>
    <button id="send-btn" onclick="sendMessage()">↑</button>
  </div>
  <div id="booked-toast" class="booked-toast"></div>
  <div id="takeover-banner" class="takeover-banner">⚠️ Human Takeover Active — AI is paused. You are replying as the owner.</div>
  <div class="custom-instructions">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <label style="margin-bottom:0">Custom Business Instructions</label>
      <button onclick="generateInstructions()" style="font-size:10px;padding:2px 8px;background:#4f8ef7;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;">⚡ Generate</button>
    </div>
    <textarea id="custom-instructions" rows="2" placeholder="e.g. House call only, +$50 travel fee. Sedan from $50, SUV from $120."></textarea>
  </div>
  <div class="bottom-bar">
    <button class="reset-btn" onclick="resetChat()">↺ Reset</button>
    <button class="cal-btn" onclick="window.open('/calendar','_blank')">📅 Calendar</button>
    <button id="takeover-btn" onclick="toggleTakeover()" style="background:none;border:none;border-left:1px solid #e0e0e0;color:#e65100;font-size:11px;font-weight:700;padding:6px 8px;cursor:pointer;width:auto;">🙋 Takeover</button>
    <select class="agent-select" id="agent-type" onchange="resetChat()">
      <option value="plumbing">🔧 Plumbing</option>
      <option value="hvac">❄️ HVAC</option>
      <option value="auto_detailing">🚗 Auto Detail</option>
      <option value="junk_removal">🗑️ Junk Removal</option>
      <option value="garage_door_repair">🚪 Garage Door</option>
      <option value="pet_grooming">🐾 Pet Grooming</option>
      <option value="general_handyman">🪛 Handyman</option>
      <option value="electrical">⚡ Electrical</option>
      <option value="locksmith">🔑 Locksmith</option>
      <option value="car_repair">🔩 Car Repair</option>
      <option value="carpet_cleaning">🧹 Carpet Clean</option>
      <option value="pressure_washing">💦 Pressure Wash</option>
      <option value="landscaping">🌿 Landscaping</option>
      <option value="appliance_repair">🫙 Appliance</option>
      <option value="door_repair">🚪 Door Repair</option>
    </select>
  </div>
</div>

<script>
  const AGENT_INSTRUCTIONS = {
    plumbing: "Calgary & surrounding area. Services: Drain Cleaning $150-300, Leak Repair $100-250, Toilet Repair $80-200, Water Heater $800-1500, Pipe Replacement $300-1200, Sump Pump $200-600. Weekend surcharge $50. Emergency call-out fee $150. Specialty: older home re-piping and basement sump pump installs. Most jobs same-day or next-day. Senior discount 10%.",
    hvac: "Calgary & Airdrie. Services: Furnace Repair $150-400, AC Tune-Up $100-200, Heat Pump Install $3000-6000, Duct Cleaning $300-500, Thermostat Install $80-200. Emergency after-hours fee $175. Specialty: high-efficiency furnace upgrades and new builds. All techs TECA certified. Winter priority response within 4 hours for no-heat calls.",
    auto_detailing: "Mobile service — we come to you anywhere in Calgary & Chestermere. Travel fee $50 outside city limits. Sedan full detail from $180, SUV/truck from $220, minivan from $240. Interior only from $120. Ceramic coating from $600. Specialty: odour elimination and pet hair removal. Booking deposit required for ceramic coating.",
    junk_removal: "Calgary metro & Rocky View County. Single item from $75, half load $200-280, full load $350-480. Same-day available most days. Specialty: estate cleanouts and post-reno debris. We donate usable items to local charities. Hazardous materials (paint, chemicals) not accepted. Crew of 2 included in all loads.",
    garage_door_repair: "Calgary & surrounding communities. Spring replacement $180-280, opener repair $100-250, new door install from $900. Same-day service for door-stuck-open emergencies. Specialty: LiftMaster and Chamberlain openers. All parts carry 1-year warranty. Free safety inspection with any repair.",
    pet_grooming: "Mobile grooming van — we come to your home in Calgary, Cochrane & Okotoks. No travel fee within Calgary. Small dog from $65, medium from $85, large from $110, giant breed from $140. Add-ons: teeth brushing $15, anal glands $15, de-shedding $25 extra. Specialty: anxious and senior dogs. Appointment required, 24hr cancellation policy.",
    general_handyman: "Calgary & Foothills. Min call-out $80 (first hour), $65/hr after. Drywall patch from $80, TV mount $85, furniture assembly $60-120, door adjustment $80. Specialty: honey-do lists and pre-sale home prep. No electrical panel or gas line work — will refer licensed trades. Same-week availability most jobs.",
    electrical: "Calgary & Airdrie. Licensed master electrician on all jobs. Panel upgrade $1500-3500, outlet install $80-150, EV charger $500-1200, pot light install $80-120 each, inspection $150. Emergency after-hours $200 call-out. Specialty: EV charger installs and older home panel replacements. All work permit-pulled where required.",
    locksmith: "24/7 service across Calgary. Home lockout $80-120, car lockout $60-100, rekey per lock $50-90, new lock install $100-200, smart lock setup $150-300. Emergency response within 30-60 min. Specialty: Schlage and Kwikset smart locks. Senior and military discount 10%. No hidden fees — price confirmed before work starts.",
    car_repair: "Calgary NE & surrounding. Oil change from $60, brakes from $200/axle, tire swap $80, diagnostics $100 (waived on repair), battery $150-250. Specialty: Japanese and Korean makes (Toyota, Honda, Hyundai, Kia). Loaner vehicle available for jobs over 4 hours. All parts sourced from OEM or top-tier aftermarket. 1-year parts warranty.",
    carpet_cleaning: "Calgary & Cochrane. Per room $80-120 (min 2 rooms), whole home discount 15%, upholstery sofa from $100, area rug from $60. Specialty: pet stain and odour treatment with enzymatic cleaner. Truck-mounted steam cleaning only — no portable machines. Dry time 4-6 hours. Move furniture $20 extra per room.",
    pressure_washing: "Calgary & surrounding areas. Driveway from $150, house wash from $300, deck/fence from $150, roof treatment from $400. Specialty: soft-wash for stucco and vinyl siding — no damage. Graffiti removal quoted on site. Spring and fall booking fills fast — book early. Hot water rig for oil stains on concrete.",
    landscaping: "Calgary & Foothills County. Lawn mow from $50 (up to 5000 sqft), hedge trim from $80, full cleanup from $200, sod install from $1.50/sqft installed. Specialty: xeriscaping and low-water yards suited to Calgary climate. Weekly and biweekly mow contracts available. Snow removal seasonal contracts from $350/season.",
    appliance_repair: "Calgary in-home service. Diagnostic $85 (waived if repaired same visit). Fridge $120-300, washer/dryer $100-250, dishwasher $100-200, oven $100-280. Specialty: LG, Samsung, and Whirlpool. Parts stocked on van for most common repairs — often same-visit fix. Senior discount 10%. No repair fee if part unavailable.",
    door_repair: "Calgary & Strathmore. Door adjustment $80, hinge replace $60-100, lock install $100-200, frame repair $150-350, full door supply & install from $500. Specialty: security door upgrades and storm door installs. Emergency board-up service for break-ins. All exterior doors weatherstripped as standard. 1-year labour warranty.",
  };

  function generateInstructions() {
    const type = document.getElementById('agent-type').value;
    const el = document.getElementById('custom-instructions');
    el.value = AGENT_INSTRUCTIONS[type] || '';
    el.style.borderColor = '#4f8ef7';
    setTimeout(() => el.style.borderColor = '#ddd', 800);
  }

  let humanTakeover = false;

  function toggleTakeover() {
    humanTakeover = !humanTakeover;
    const btn = document.getElementById('takeover-btn');
    const banner = document.getElementById('takeover-banner');
    if (humanTakeover) {
      btn.textContent = '🤖 Hand back to AI';
      btn.style.color = '#27ae60';
      banner.style.display = 'block';
      document.getElementById('input').placeholder = 'Reply as owner...';
    } else {
      btn.textContent = '🙋 Takeover';
      btn.style.color = '#e65100';
      banner.style.display = 'none';
      document.getElementById('input').placeholder = 'iMessage';
      addBubble('AI has resumed the conversation.', 'anna', 'system');
    }
  }

  async function updateUsage() {
    try {
      const res = await fetch('/api/gemini/usage');
      const d = await res.json();
      document.getElementById('usage-badge').textContent =
        `Gemini: ${d.total_calls} calls · ~${d.estimated_input_tokens + d.estimated_output_tokens} tokens · ~$${d.estimated_cost_usd} USD · ${d.errors} errors`;
    } catch(e) {}
  }
  updateUsage();
  setInterval(updateUsage, 10000);

  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const typingEl = document.getElementById('typing');

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function addBubble(text, type, meta) {
    const div = document.createElement('div');
    div.className = `bubble ${type}`;
    div.innerHTML = `${text}<div class="meta">${meta || ''}</div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    sendBtn.disabled = true;

    // Human takeover mode — persist to backend then show as owner bubble
    if (humanTakeover) {
      try {
        await fetch('/api/test/owner-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
      } catch(e) {}
      addBubble(text, 'owner', 'owner reply');
      sendBtn.disabled = false;
      inputEl.focus();
      return;
    }

    addBubble(text, 'customer', '');
    typingEl.style.display = 'block';
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const agentType = document.getElementById('agent-type').value;
      const customInstructions = document.getElementById('custom-instructions').value.trim();
      const res = await fetch('/api/test/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, agent_type: agentType, custom_instructions: customInstructions }),
      });
      const data = await res.json();
      typingEl.style.display = 'none';
      const confidencePct = Math.round((data.confidence || 0) * 100);
      const reviewFlag = data.needs_review ? ' · ⚠️ needs review' : '';
      const confColor = data.needs_review ? '#e74c3c' : confidencePct >= 80 ? '#27ae60' : '#f57c00';
      addBubble(data.response, 'anna', `${data.char_count} chars · turn ${data.turn} · <span style="color:${confColor};font-weight:600">${confidencePct}% conf${reviewFlag}</span>`);
      if (data.booked_slot) {
        const toast = document.getElementById('booked-toast');
        toast.textContent = `✓ Booked: ${data.booked_slot.date} ${data.booked_slot.time}`;
        toast.style.display = 'block';
      }
    } catch (e) {
      typingEl.style.display = 'none';
      addBubble('Error reaching server.', 'anna', '');
    }

    sendBtn.disabled = false;
    inputEl.focus();
  }

  async function resetChat() {
    await fetch('/api/test/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '', reset: true }),
    });
    const agentLabel = document.getElementById('agent-type').selectedOptions[0].text;
    document.getElementById('header-title').textContent = `Anna — ${agentLabel}`;
    messagesEl.innerHTML = `<div class="bubble anna">Switched to ${agentLabel}. Say hi!</div>`;
  }
</script>
</body>
</html>"""

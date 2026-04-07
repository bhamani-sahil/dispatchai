# DispatchAI — Build Status & Remaining Work

## Current Date
Last updated: 2026-04-03 (session 2)

## How to Pick Up
1. Read this file completely
2. Backend: `cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0`
3. Mobile: `cd mobile && npx expo start --clear`
4. ngrok: `"C:\Users\sahil\OneDrive\Desktop\ocean_files\ngrok.exe" http 8000`
5. **Active webhook: POST https://xxxx.ngrok-free.app/api/webhooks/twilio/inbound** (Twilio — point Twilio dashboard here)
6. LAN IP: 10.0.0.177 — verify with `ipconfig` (NordVPN adapter can interfere even when disconnected)
7. Supabase email confirmation: DISABLED ✅ (do not re-enable)

---

## ✅ COMPLETE — Verified Working as of 2026-04-03

### Core Pipeline
- SMS in → Gemini AI → SMS reply → booking confirmed ✅
- AI reads custom instructions mid-conversation ✅
- AI reads services table for structured pricing ✅
- Human takeover → owner reply → handback → AI picks up context ✅
- Cancel intent → removes booking from calendar + dashboard ✅
- Confidence scoring → needs_review flag working ✅
- Gemini hallucination fix: will NOT make up emails/phones/contact info ✅
- Anna (AI agent) name is now fully customizable per business ✅
- First message context-aware: if customer states need upfront, Anna acknowledges it instead of generic intro ✅
- Callback number reads from `business.phone` — no hardcoded fallback, no fake numbers ✅
- Full date in all booking confirmations ("Friday, April 3" not just "Friday") ✅
- Booked slots no longer offered — `_normalize_to_template_slot()` fixes hour vs range format mismatch ✅
- Sunday open/closed now respects business_hours setting (was hardcoded closed) ✅
- Sunday bookings log to Supabase correctly ✅
- Double-booking on server restart fixed — Supabase check replaces in-memory set ✅
- Message spam cap: 20 messages → sends polite close, marks conversation closed ✅

### Dashboard
- Animated stat cards (spring): Revenue, Time Saved, Bookings, AI Score ✅
- AI Score capped at 100% (was showing 300%+ with manual bookings) ✅
- Tab-switch refresh with `useFocusEffect` (was stale after switching tabs) ✅
- Upcoming jobs excludes blocked slots and phone-less entries ✅
- Recent activity: blocked entries show "Blocked: date time" with ban icon + grey style ✅
- Marking a blocked slot available removes it from activity feed ✅
- Chat icon in Quick Actions is blue (was grey) ✅
- Period filter pills: Today / 7 Days / Month / All ✅

### Scheduler / Calendar
- Weekly grid with explicit row rendering — Saturday column no longer disappears ✅
  (Root cause: React Native flexWrap 14.285% rounding bug — fixed with explicit week rows + `flex: 1` cells)
- Booking cards: briefcase icon (was scissors — leftover from pet grooming testing) ✅
- Create booking modal with MiniCalendar date picker + TimeSlotPicker chips ✅
- Block Time tab: multi-slot entries, All Day toggle ✅
- DELETE /api/calendar/bookings/{id} — blocked slots only, rejects real bookings ✅
- Forward to Tech: manual phone number input ✅

### Settings
- Keyboard no longer covers inputs on Business Profile screen ✅
  (`KeyboardAvoidingView` + `automaticallyAdjustKeyboardInsets` on iOS + large paddingBottom on Android)
- Callback phone field saves to `business.phone` ✅
- AI Agent Name field: customizable, saves to `agent_name`, defaults to "Anna" ✅

### Inbox
- AI confidence pill per conversation (green ≥85%, amber 65–84%, red <65%) ✅
- Human takeover banner, takeover/handback/reply working ✅
- Polls every 8s — no restart needed ✅

### Intelligence (Brain)
- Schedule scan, invoice generation, PDF card with tappable link ✅
- Brain assistant uses customizable agent name ✅

### Infrastructure
- Switched from Twilio to Telnyx for inbound SMS ✅
- `telnyx_webhook.py` is the active webhook handler ✅

---

## 🐛 KNOWN REMAINING ISSUES

1. **No deployment** — backend is localhost + ngrok. If laptop sleeps, everything dies. Must deploy to Railway before any real demo.
2. **Twilio KYC pending** — need to complete Twilio identity verification tomorrow (2026-04-04). See SMS Provider notes below.
3. **PDF open from Brain** — need to verify Supabase Storage bucket is public and `pdf_url` resolves correctly.
4. **Contacts picker for Forward to Tech** — tried `expo-contacts` twice (state lift + search-on-demand), both froze Scheduler tab. Removed. Manual phone entry for now.

---

## 🔲 NEXT SESSION — Priority Order

### 🔴 Deploy (most important)
1. **Complete Twilio KYC** (2026-04-04)
   - Select Individual / Sole Proprietor
   - Personal name + Calgary AB address
   - Submit driver's license for ID
   - Tax ID field: leave blank or skip — not required for Canadian sole proprietor
   - **A2P 10DLC registration is NOT needed** — we are Canada-only (Canadian → Canadian SMS). A2P is a US carrier requirement only.
   - CASL compliance: covered — customers text us first (express consent)
2. **Railway deploy**
   - Push backend, set all env vars (SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE, etc.)
   - Update Twilio webhook URL in Twilio dashboard to Railway URL
   - Update `mobile/src/lib/api.ts` BASE_URL from `10.0.0.177:8000` to Railway URL
3. **Supabase** — confirm email confirmation is off, CORS origins include Railway URL
4. **Build and distribute**
   - PWA (iOS): `expo export --platform web` → host on Vercel → business owners add to home screen via Safari
   - APK (Android): `eas build --platform android --profile preview` → direct download link, no Play Store needed

### 🟡 Codebase Cleanup (do while waiting for Twilio A2P)

**Delete immediately — no risk:**
- `backend/app/routes/test_chat.py` — 440+ lines of test UI + debug endpoints exposed as real API routes
- `check_models/` directory — throwaway Gemini test scripts
- `mobile/App.tsx` — Expo boilerplate stub, never imported (entry is `app/_layout.tsx`)
- `supabase_bookings.sql`, `supabase_phase4_5.sql` — one-time migrations already applied

**Needs decision first:**
- `backend/app/routes/webhooks.py` — original Twilio webhook, now dead (on Telnyx). Has extra logic (reschedule detection, address extraction) not yet in `telnyx_webhook.py`. Review before deleting.
- `backend/app/services/twilio_service.py` — only used by webhooks.py. Remove together.
- `backend/app/routes/app_ui.py` / `admin_ui.py` / `calendar_ui.py` — old web UI (70KB+ HTML in Python). Remove if mobile is the product.

**Refactor:**
- `_best_slot_match()` copy-pasted identically in 3 files — extract to shared utility
- `/api/calendar/slots` vs `/api/calendar/all-slots` — consolidate

### 🟢 Post-Launch
- Programmatic Telnyx number provisioning (self-serve phone number on signup)
- Web version (React + Vercel) — ~1 week of work
- Rate limiting on webhook (carrier-level via A2P + app-level 20-msg cap already in place)

---

## Pending Supabase Migrations
```sql
-- Agent name (added 2026-04-03, apply if not done)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS agent_name text;

-- Blocked status on bookings constraint (may be pending from earlier)
-- bookings_status_check needs 'blocked' added if constraint exists
```

---

## Architecture Reference

### Backend Stack
```
backend/app/
  routes/
    auth.py              — /api/auth/login, /api/auth/signup, /api/auth/me
    telnyx_webhook.py    — /api/webhooks/telnyx/inbound (ACTIVE — Telnyx SMS → Gemini → reply)
    webhooks.py          — /api/webhooks/twilio/inbound (DEAD — was Twilio, now unused)
    conversations.py     — /api/conversations, /{id}/messages, takeover/handback/reply
    dashboard.py         — /api/dashboard, /api/dashboard/agent-toggle
                           /api/calendar/bookings, /all-slots, /book, /forward-tech
                           /api/calendar/bookings/{id}/status
                           DELETE /api/calendar/bookings/{id} (blocked slots only)
    brain.py             — /api/brain/chat (schedule_scan, text_customer, generate_document,
                           pricing_update, forward, general)
    documents.py         — /api/documents/generate, GET, /{id}/send
    business.py          — /api/business CRUD
    app_ui.py            — /app (old web SPA — candidate for deletion)
    admin_ui.py          — /admin (old admin UI — candidate for deletion)
    calendar_ui.py       — /calendar (old calendar UI — candidate for deletion)
    test_chat.py         — /test (debug UI — DELETE before production)
  services/
    agent.py             — generate_response() [SMS], generate_json() [structured], summarize_booking()
    prompt_builder.py    — 3-layer prompt. Reads agent_name from business (defaults "Anna")
    calendar_service.py  — get_available_slots(), book_slot(), _normalize_to_template_slot()
    brain.py             — detect_intent(), handle_* functions, build_brain_prompt(agent_name)
    pdf_service.py       — ReportLab PDF, upload to Supabase Storage
    telnyx_service.py    — send_sms() async ✅ ACTIVE
    twilio_service.py    — send_sms() sync — UNUSED (candidate for deletion)
```

### Mobile Stack
```
mobile/app/
  _layout.tsx           — Root Stack
  index.tsx             — Auth check → redirect
  (auth)/
    login.tsx           — Login/Signup
    onboarding.tsx      — 3-step: personal → industry sector → operational rules
  (tabs)/
    _layout.tsx         — Bottom tabs (Ionicons)
    dashboard.tsx       — Metrics, agent toggle, upcoming jobs, activity (useFocusEffect refresh)
    inbox.tsx           — Conversation list (polls 8s) → detail chat, takeover/reply
    scheduler.tsx       — Weekly calendar grid + booking cards (explicit row rendering)
    brain.tsx           — Intelligence: chat, suggestion chips, PDF card
  settings/
    index.tsx           — Settings home: profile card + sections + logout
    business.tsx        — Name, sector, service area, hours, callback phone, agent name
    instructions.tsx    — System prompt textarea
    services.tsx        — Services list + add/edit/delete modal
mobile/src/
  lib/api.ts            — axios, BASE_URL=10.0.0.177:8000, global 401 interceptor
  lib/auth.ts           — login/signup with 20s timeout
  types/index.ts        — TypeScript interfaces
  theme.ts              — colors.bg=#FAF9F7, orange=#F96302
```

### Key API Endpoints
| Screen | Endpoint |
|--------|----------|
| Login | POST /api/auth/login |
| Signup | POST /api/auth/signup |
| Onboarding | POST /api/business |
| Dashboard | GET /api/dashboard?period=X |
| Agent toggle | PUT /api/dashboard/agent-toggle |
| Inbox list | GET /api/conversations |
| Messages | GET /api/conversations/{id}/messages |
| Reply | POST /api/conversations/{id}/reply |
| Takeover/Handback | PUT /api/conversations/{id}/takeover or /handback |
| Scheduler | GET /api/calendar/bookings |
| Booking status | PUT /api/calendar/bookings/{id}/status |
| Delete blocked | DELETE /api/calendar/bookings/{id} |
| Forward tech | POST /api/calendar/forward-tech |
| Brain | POST /api/brain/chat |
| Settings GET | GET /api/business |
| Settings PUT | PUT /api/business |
| Services CRUD | GET/POST/PUT/DELETE /api/business/services |

### Supabase Tables
- `businesses` (id, user_id, name, agent_type, agent_name, agent_active, twilio_phone, hours_text, business_hours, custom_instructions, service_area, phone, etransfer_email)
- `services` (id, business_id, name, description, flat_price, price_min, price_max, is_active, sort_order)
- `conversations` (id, business_id, customer_phone, status, last_message_at)
- `messages` (id, conversation_id, sender_type, body, direction, ai_confidence)
- `bookings` (id, business_id, slot_date, slot_time, customer_phone, customer_address, job_summary, status, conversation_id)
- `documents` (id, business_id, doc_type, doc_number, total, pdf_url, customer_name, customer_phone)
- Storage bucket: "documents" (must be public for PDF links to work)

### SMS Provider
- **Twilio +18257730166** — PRIMARY going forward. `webhooks.py` is the active handler.
- **Telnyx +18253956507** — kept as reference only. `telnyx_webhook.py` kept but not active.
- Twilio was temporarily paused during testing (hit free daily message limit). Switched to Telnyx to finish testing. All service-layer fixes (calendar, slots, Sunday hours) apply to both since they share the same services.
- **Why Twilio over Telnyx:** Twilio `webhooks.py` had more complete logic (cancel detection, reschedule detection, address extraction, human takeover skip, needs_review flagging). Telnyx webhook was missing all of these.
- **Canada-only note:** No A2P 10DLC required. That is a US carrier mandate only. CASL applies — covered by inbound-first consent model.

### Important Patterns
- Webhook always returns 200 immediately, processes in background (`asyncio.create_task`)
- Human-like delay: 15–40s typing simulation before AI reply
- Phone numbers stored in E.164 format (+1XXXXXXXXXX)
- Service role key for webhooks, anon key + JWT for authenticated routes
- Slot IDs: `"{date_raw}|{time}"` format
- Prompt: 3 layers — base rules → business config (agent_name, hours, services) → conversation context
- `hours_text` (string for AI) + `business_hours` (JSON for calendar) always saved together
- `_normalize_to_template_slot()` converts hour format ("08:00") to range format ("8:00-10:00am") for slot matching

### Cost Structure (per business/month)
- Telnyx number: ~$2 CAD
- SMS (avg 100 msg): ~$5–8 CAD
- Gemini Flash: ~$0.50 CAD
- Supabase (shared): ~$1–2 CAD
- Railway (shared): ~$1–2 CAD
- **Total COGS: ~$10–14 CAD at $99/month = ~85% margin**

### Go-to-Market
- Target: home service businesses (pet grooming, auto detailing, plumbing, HVAC, landscaping)
- Distribution: Facebook Marketplace, Google Business Profile second messaging number
- Pitch: "Text this number for instant quotes and bookings"
- Manual Twilio number provisioning for first 10–20 pilots
- **App distribution plan:**
  - iOS: PWA via `expo export --platform web` → Vercel → Safari "Add to Home Screen"
  - Android: APK via `eas build --platform android --profile preview` → direct download link
  - No App Store / Play Store needed for pilot phase

---

## Session Log

### 2026-04-03 (Session 2)
**Twilio vs Telnyx decision:**
- Twilio ran out of free daily messages during testing — temporarily switched to Telnyx to finish testing
- Decided to go back to Twilio as primary (more complete webhook logic: cancel/reschedule detection, address extraction, human takeover, needs_review flagging)
- Telnyx kept as reference — `telnyx_webhook.py` not deleted

**`webhooks.py` (Twilio) upgraded with Telnyx improvements:**
- Replaced in-memory `_booked_conversations` set with Supabase check — now restart-safe
- Added fire-and-forget (`asyncio.create_task`) — Twilio gets TwiML back immediately, no timeout risk
- Added 15–40s human-like delay before Gemini reply
- Added MessageSid dedup (`_processed_sids`) — prevents double-processing on Twilio retries
- Added 20-message spam cap — closes conversation, sends polite close message
- `send_sms` (sync Twilio client) now called via `run_in_executor` so it doesn't block the async event loop

**SMS registration clarified:**
- A2P 10DLC = US carriers only. Not required for Canada → Canada SMS.
- CASL applies — covered because customers text first (inbound-first consent).
- No trade name registration needed for Twilio KYC — sole proprietor with personal ID is sufficient.
- Tax ID field: leave blank or skip — CRA Business Number not required unless incorporated.
- Twilio KYC to be completed 2026-04-04.

**Distribution plan decided:**
- Backend deploy to Railway → update `BASE_URL` in `mobile/src/lib/api.ts` → done
- iOS: Expo web export → PWA on Vercel
- Android: EAS APK build → direct download link
- No App Store or Play Store needed for pilot

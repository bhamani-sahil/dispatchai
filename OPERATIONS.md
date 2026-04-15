# CueDesk — Operations Guide

## Last Updated
2026-04-15 (Session 6 — webapp live on Vercel, door-to-door started)

---

## 🚀 Production URLs

| Service | URL |
|---------|-----|
| Backend (Railway) | https://dispatchai-production-a289.up.railway.app |
| Webapp (Vercel) | https://dispatchai-beta.vercel.app *(confirm domain in Vercel dashboard)* |
| Mobile PWA (legacy) | https://dispatchai-beta.vercel.app |
| Supabase | https://nylkvrmsdjcrbnskqmuh.supabase.co |

**Twilio number:** +18257730166
**Twilio SMS webhook:** `https://dispatchai-production-a289.up.railway.app/api/webhooks/twilio/inbound`
**Twilio Voice webhook:** `https://dispatchai-production-a289.up.railway.app/api/webhooks/twilio/voice`

---

## 🔄 How to Resume Development

**Backend (only if testing locally):**
```bash
cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0
```

**Webapp:**
```bash
cd webapp && yarn start
```

**Mobile (React Native — only if testing native app):**
```bash
cd mobile && npx expo start --clear
```

**ngrok (if testing webhooks locally):**
```bash
"C:\Users\sahil\OneDrive\Desktop\ocean_files\ngrok.exe" http 8000
```

**Deploying changes:**
```bash
git add .
git commit -m "your message"
git push
```
Railway and Vercel auto-redeploy on every push to `main`. ~1-2 min for Railway, ~2-3 min for Vercel.

---

## 📞 Setting Up Missed-Call Forwarding (Manual — Pilot)

Do this with the business owner when onboarding:

1. **Confirm their carrier supports conditional forwarding** (Bell, Rogers, Telus all do)
2. **Disable their existing voicemail** — our system replaces it
3. **Set conditional forward** (forward when unanswered):
   - iPhone: Settings → Phone → Call Forwarding → enter Twilio number
   - Bell/Rogers dial code: `*21*+18257730166#` then call
4. **Configure Twilio Console** → click the number → Voice & Fax → "A Call Comes In" → Webhook → `https://dispatchai-production-a289.up.railway.app/api/webhooks/twilio/voice` → POST → Save
5. **Test** — call their number from another phone, let it ring, confirm voice message plays and SMS arrives

**Pitch:** *"You know how many jobs you've lost because someone called, you were under a car, didn't pick up, and moved on? One forwarding code and every missed call becomes a text conversation Anna handles automatically."*

---

## 📱 Onboarding a New Pilot Business

1. **Sign them up** — open webapp URL → Sign Up → walk through onboarding
2. **Buy a Twilio number** — Twilio Console → Phone Numbers → Buy → pick local Canadian number (~$2 CAD/month)
3. **Configure webhook on that number** — Twilio Console → click number → Messaging → set to Railway webhook URL above
4. **Update Supabase** — Table Editor → `businesses` → find their row → set `twilio_phone` to new number in E.164 format (e.g. `+14031234567`)
5. **Hand them the webapp URL** to bookmark or add to home screen

---

## ✅ Everything Working as of 2026-04-15

### Core Pipeline
- SMS in → Gemini AI → SMS reply → booking confirmed ✅
- AI reads custom instructions mid-conversation ✅
- AI reads services table for structured pricing ✅
- Human takeover → owner reply → handback → AI picks up context ✅
- Cancel intent → removes booking from calendar + dashboard ✅
- Confidence scoring → needs_review flag working ✅
- Booking confirmation works for both house-call and shop drop-off ✅
- Gemini hallucination fix: will NOT make up emails/phones/contact info ✅
- AI agent name fully customizable per business (defaults to "Anna") ✅
- First message context-aware ✅
- Full date in all booking confirmations ✅
- Booked slots no longer offered to new customers ✅
- Sunday open/closed respects business_hours setting ✅
- Double-booking on server restart fixed (Supabase check) ✅
- Message spam cap: 20 messages → polite close ✅
- Gemini 503 retry — transient failures handled ✅
- 5s debounce — rapid messages bundled into one Gemini call ✅
- 30s delay + double confirmation on follow-up messages fixed ✅
- Date timezone bug fixed ✅
- Max bookings per slot — multi-tech capacity support ✅

### Webapp (React + Vercel) — NEW
- Landing page: Hero, Features, How It Works, SMS Demo, Industries, Pricing, Social Proof ✅
- Signup modal ✅
- Dashboard, Schedule, Settings, Onboarding, Login pages ✅
- Pricing: Early Access badge, $99 strikethrough → Free, Pro+ card with voice/image coming soon ✅

### Dashboard
- Animated stat cards: Revenue, Time Saved, Bookings, AI Score ✅
- AI Score capped at 100% ✅
- Period filter pills: Today / 7 Days / Month / All ✅
- Upcoming jobs excludes blocked slots ✅

### Scheduler
- Weekly grid — all 7 days render correctly ✅
- Block Time + manual booking modal ✅
- Forward to Tech with manual phone entry ✅
- Week navigation (partially fixed — 1-2 bugs remain)

### Inbox
- AI confidence pill per conversation ✅
- Human takeover / handback / reply ✅
- Polls every 8s ✅

### Settings
- Business profile, hours, callback phone, agent name ✅
- Custom AI instructions ✅
- Services CRUD with pricing ✅
- Max bookings per slot setting ✅

### Missed-Call Entry Point
- Customer calls business's real number → no answer → conditional forward to Twilio ✅
- Twilio plays: *"Thanks for calling [Business]! We'll follow up over text right away."* ✅
- SMS opener sent to caller automatically ✅
- Full Gemini conversation + booking flows from there ✅
- If caller already has active convo — skips opener, existing thread continues ✅

### Infrastructure
- Backend on Railway — always on, no ngrok ✅
- Webapp on Vercel with custom domain ✅
- CORS configured ✅
- GitHub → auto-deploy on push ✅

---

## 🐛 Known Issues

1. **Scheduler week navigation** — 1-2 bugs remaining (TBD what exactly breaks)
2. **Sunday bookings** — Anna books on Sunday but calendar may not update. Monitor.
3. **`test_chat.py`** — debug endpoints still exposed. Delete before public launch.
4. **No password minimum** — `123456` is accepted. Add 8-char minimum before public launch.
5. **No Twilio webhook signature validation** — low risk for pilot, add before scaling.
6. **`admin_ui.py`, `app_ui.py`, `calendar_ui.py`** — old web UI routes, candidates for deletion.

---

## 🟡 Next Up

### Short term
- Fix remaining 1-2 scheduler bugs
- Twilio A2P 10DLC approval (submitted, waiting ~1 week)
- Convert first door-to-door positive lead (1/6 from Apr 14 run)
- Cold message Facebook Marketplace businesses

### Medium term
- Voice calls — AI answers and books (Pro+ feature)
- Voice note transcription
- Image/photo analysis
- Stripe billing integration
- Programmatic Twilio number provisioning (self-serve on signup)

### Infrastructure
- Rate limiting on webhook
- Password minimum validation on signup

---

## 💰 Cost Structure (per business/month)

| Item | Cost (CAD) |
|------|-----------|
| Twilio number | ~$2 |
| SMS (avg 100 msg) | ~$5–8 |
| Gemini Flash | ~$0.50 |
| Supabase (shared) | ~$1–2 |
| Railway (shared) | ~$1–2 |
| **Total COGS** | **~$10–14** |

At $99/month → ~85% margin. Beta users get it free.

---

## 🏗️ Architecture

### Backend (Railway)
```
backend/app/
  routes/
    auth.py              — /api/auth/login, /api/auth/signup, /api/auth/me
    webhooks.py          — /api/webhooks/twilio/inbound + /twilio/voice (ACTIVE)
    telnyx_webhook.py    — kept as reference, not active
    conversations.py     — inbox, takeover, handback, reply
    dashboard.py         — metrics, agent toggle, bookings, calendar
    brain.py             — AI assistant (schedule scan, documents, pricing)
    documents.py         — PDF generation
    business.py          — business profile + services CRUD
  services/
    agent.py             — Gemini response generation (with 503 retry)
    prompt_builder.py    — 3-layer prompt (base → business config → conversation)
    calendar_service.py  — slot availability, booking logic, max_bookings_per_slot
    brain.py             — brain intent detection
    pdf_service.py       — ReportLab PDF + Supabase Storage upload
    twilio_service.py    — Twilio SMS (active)
```

### Webapp (Vercel) — PRIMARY FRONTEND
```
webapp/src/
  components/landing/
    LandingPage.jsx      — landing page shell
    Hero.jsx             — hero + CTA
    Features.jsx         — feature grid
    HowItWorks.jsx       — 3-step flow
    SMSDemo.jsx          — animated SMS demo
    Pricing.jsx          — Pro (free beta) + Pro+ (custom) cards
    Navigation.jsx, Footer.jsx, SignupModal.jsx, etc.
  components/app/
    Dashboard.jsx        — metrics + upcoming jobs
    Schedule.jsx         — weekly calendar + booking
    Settings.jsx         — business profile, hours, services, max bookings
    Onboarding.jsx       — 3-step business setup
    Login.jsx
  lib/api.js             — API client → Railway backend
```

### Mobile (React Native — secondary, native iOS)
```
mobile/app/
  (auth)/login.tsx, onboarding.tsx
  (tabs)/dashboard.tsx, inbox.tsx, scheduler.tsx, brain.tsx
  settings/
mobile/src/lib/
  api.ts, auth.ts, storage.ts
```

### Supabase Tables
- `businesses` — id, user_id, name, agent_name, agent_active, twilio_phone, hours, instructions, phone, max_bookings_per_slot
- `services` — id, business_id, name, pricing, is_active
- `conversations` — id, business_id, customer_phone, status
- `messages` — id, conversation_id, sender_type, body, ai_confidence
- `bookings` — id, business_id, slot_date, slot_time, customer_phone, address, job_summary, status
- `documents` — id, business_id, doc_type, pdf_url, customer details

### Pending Supabase Migrations
```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS max_bookings_per_slot integer DEFAULT 1;
```

# DispatchAI — Operations Guide

## Last Updated
2026-04-07 (Session 3 — first live deployment)

---

## 🚀 Production URLs

| Service | URL |
|---------|-----|
| Backend (Railway) | https://dispatchai-production-a289.up.railway.app |
| Frontend (Vercel PWA) | https://dispatchai-beta.vercel.app |
| Supabase | https://nylkvrmsdjcrbnskqmuh.supabase.co |

**Twilio number:** +18257730166
**Twilio webhook:** `https://dispatchai-production-a289.up.railway.app/api/webhooks/twilio/inbound`

---

## 🔄 How to Resume Development

Local dev is no longer required for the product to work. Backend and frontend are live.

Only start local if you're making and testing code changes:

**Backend (only if testing locally):**
```bash
cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0
```

**Mobile (only if testing locally):**
```bash
cd mobile && npx expo start --clear
```

**Deploying changes:**
```bash
git add .
git commit -m "your message"
git push
```
Railway and Vercel auto-redeploy on every push to `main`. ~1-2 min for Railway, ~2-3 min for Vercel.

---

## 📱 Onboarding a New Pilot Business

1. **Sign them up** — open Vercel PWA URL → Sign Up → walk through onboarding
2. **Buy a Twilio number** — Twilio Console → Phone Numbers → Buy → pick local Canadian number (~$2 CAD/month)
3. **Configure webhook on that number** — Twilio Console → click number → Messaging → set to Railway webhook URL above
4. **Update Supabase** — Table Editor → `businesses` → find their row → set `twilio_phone` to new number in E.164 format (e.g. `+14031234567`)
5. **Hand them:**
   - Vercel PWA URL → Safari (iOS) or Chrome (Android) → Add to Home Screen
   - Their Twilio number to advertise (Facebook, Google Business, flyers)

---

## ✅ Everything Working as of 2026-04-07

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
- Scheduler refreshes business hours on tab focus (useFocusEffect) ✅

### Dashboard
- Animated stat cards: Revenue, Time Saved, Bookings, AI Score ✅
- AI Score capped at 100% ✅
- Period filter pills: Today / 7 Days / Month / All ✅
- Upcoming jobs excludes blocked slots ✅

### Scheduler
- Weekly grid — all 7 days render correctly ✅
- Block Time + manual booking modal ✅
- Forward to Tech with manual phone entry ✅

### Inbox
- AI confidence pill per conversation ✅
- Human takeover / handback / reply ✅
- Polls every 8s ✅

### Settings
- Business profile, hours, callback phone, agent name ✅
- Custom AI instructions ✅
- Services CRUD with pricing ✅

### Infrastructure
- Backend on Railway — always on, no ngrok ✅
- Frontend PWA on Vercel — shareable URL, Add to Home Screen ✅
- CORS configured for web ✅
- SecureStore → localStorage fallback for web ✅
- SPA routing via vercel.json ✅
- GitHub → auto-deploy on push ✅

---

## 🐛 Known Issues / Pre-Launch Cleanup

1. **`test_chat.py`** — debug endpoints still exposed. Delete before public launch.
2. **No password minimum** — `123456` is accepted. Add 8-char minimum before public launch.
3. **No Twilio webhook signature validation** — low risk for pilot, add before scaling.
4. **PDF open from Brain** — verify Supabase Storage bucket is public and `pdf_url` resolves.
5. **`admin_ui.py`, `app_ui.py`, `calendar_ui.py`** — old web UI routes, candidates for deletion.

---

## 🟡 Next Up

### Short term
- Android APK via EAS (optional — PWA works on Android too via Chrome)
- Custom domain: point `dispatchai.ca` to Railway + Vercel
- Password minimum validation on signup

### Post-pilot
- Programmatic Twilio number provisioning (self-serve on signup)
- Stripe billing integration
- Web version (React + Vercel) — ~1 week
- Rate limiting on webhook

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

At $99/month → ~85% margin.

---

## 🏗️ Architecture

### Backend (Railway)
```
backend/app/
  routes/
    auth.py              — /api/auth/login, /api/auth/signup, /api/auth/me
    webhooks.py          — /api/webhooks/twilio/inbound (ACTIVE)
    telnyx_webhook.py    — kept as reference, not active
    conversations.py     — inbox, takeover, handback, reply
    dashboard.py         — metrics, agent toggle, bookings, calendar
    brain.py             — AI assistant (schedule scan, documents, pricing)
    documents.py         — PDF generation
    business.py          — business profile + services CRUD
  services/
    agent.py             — Gemini response generation
    prompt_builder.py    — 3-layer prompt (base → business config → conversation)
    calendar_service.py  — slot availability, booking logic
    brain.py             — brain intent detection
    pdf_service.py       — ReportLab PDF + Supabase Storage upload
    telnyx_service.py    — Telnyx SMS (reference only)
    twilio_service.py    — Twilio SMS (active)
```

### Frontend (Vercel)
```
mobile/app/
  (auth)/login.tsx       — Login / Signup
  (auth)/onboarding.tsx  — 3-step business setup
  (tabs)/dashboard.tsx   — Metrics + upcoming jobs
  (tabs)/inbox.tsx       — Conversation list + chat
  (tabs)/scheduler.tsx   — Weekly calendar + booking
  (tabs)/brain.tsx       — AI assistant
  settings/              — Profile, hours, instructions, services
mobile/src/
  lib/api.ts             — axios, BASE_URL=Railway, 401 interceptor
  lib/auth.ts            — login/signup/logout
  lib/storage.ts         — SecureStore (native) / localStorage (web) wrapper
```

### Supabase Tables
- `businesses` — id, user_id, name, agent_name, agent_active, twilio_phone, hours, instructions, phone
- `services` — id, business_id, name, pricing, is_active
- `conversations` — id, business_id, customer_phone, status
- `messages` — id, conversation_id, sender_type, body, ai_confidence
- `bookings` — id, business_id, slot_date, slot_time, customer_phone, address, job_summary, status
- `documents` — id, business_id, doc_type, pdf_url, customer details

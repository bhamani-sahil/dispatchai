import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2, Search, X, Building2 } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;

// ── Brand colors ──────────────────────────────────────────────────────────────
const PURPLE = "linear-gradient(135deg, #4F6EF7, #7C5CFC)";

// ── Industries ────────────────────────────────────────────────────────────────
const SECTORS = [
  { value: "plumbing",           label: "Plumbing",        emoji: "🔧", color: "#0066FF", bg: "#E6F0FF" },
  { value: "hvac",               label: "HVAC",            emoji: "❄️", color: "#00C48C", bg: "#E8FFF3" },
  { value: "electrical",         label: "Electrical",      emoji: "⚡", color: "#F59E0B", bg: "#FEF3C7" },
  { value: "pet_grooming",       label: "Pet Grooming",    emoji: "🐾", color: "#EC4899", bg: "#FDF2F8" },
  { value: "auto_detailing",     label: "Auto Detailing",  emoji: "🚗", color: "#7C3AED", bg: "#F3EEFF" },
  { value: "house_cleaning",     label: "Cleaning",        emoji: "✨", color: "#06B6D4", bg: "#E0F7FA" },
  { value: "landscaping",        label: "Landscaping",     emoji: "🌿", color: "#22C55E", bg: "#DCFCE7" },
  { value: "pest_control",       label: "Pest Control",    emoji: "🐛", color: "#EF4444", bg: "#FEE2E2" },
  { value: "carpet_cleaning",    label: "Carpet Care",     emoji: "🧹", color: "#8B5CF6", bg: "#EDE9FE" },
  { value: "junk_removal",       label: "Junk Removal",    emoji: "🗑️", color: "#64748B", bg: "#F1F5F9" },
  { value: "moving_services",    label: "Moving",          emoji: "📦", color: "#F97316", bg: "#FFEDD5" },
  { value: "general_handyman",   label: "Handyman",        emoji: "🔨", color: "#0EA5E9", bg: "#E0F2FE" },
  { value: "garage_door_repair", label: "Garage Door",     emoji: "🏠", color: "#84CC16", bg: "#ECFCCB" },
  { value: "car_repair",         label: "Car Repair",      emoji: "🔩", color: "#A855F7", bg: "#F3E8FF" },
  { value: "locksmith",          label: "Locksmith",       emoji: "🔑", color: "#EAB308", bg: "#FEF9C3" },
  { value: "pressure_washing",   label: "Pressure Wash",   emoji: "💧", color: "#0EA5E9", bg: "#E0F2FE" },
  { value: "appliance_repair",   label: "Appliance",       emoji: "⚙️", color: "#6B7280", bg: "#F3F4F6" },
  { value: "other",              label: "Other",           emoji: "📋", color: "#6B7280", bg: "#F3F4F6" },
];

const SERVICE_TYPES = [
  { value: "onsite", emoji: "🏪", label: "Onsite / Shop",  desc: "Customers come to your location" },
  { value: "mobile", emoji: "🚐", label: "Mobile / Home",  desc: "You travel to them" },
  { value: "both",   emoji: "🔄", label: "Both",           desc: "You offer both options" },
];

const DAYS = [
  { key: "weekday",  label: "Mon – Fri" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday",   label: "Sunday" },
];

function buildHoursJson(h) {
  const days = {};
  ["monday","tuesday","wednesday","thursday","friday"].forEach(d => {
    days[d] = h.weekday.open ? { open: h.weekday.start, close: h.weekday.end } : null;
  });
  days.saturday = h.saturday.open ? { open: h.saturday.start, close: h.saturday.end } : null;
  days.sunday   = h.sunday.open   ? { open: h.sunday.start,   close: h.sunday.end   } : null;
  return days;
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total = 4 }) {
  return (
    <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: PURPLE }}
        animate={{ width: `${(step / total) * 100}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Shared layout ─────────────────────────────────────────────────────────────
function OnboardingLayout({ step, onBack, children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #F8F9FE 0%, #FFFFFF 100%)" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 max-w-2xl mx-auto w-full">
        <button
          onClick={onBack}
          disabled={!onBack}
          className="w-10 h-10 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-[#475569] hover:text-[#0F172A] transition disabled:opacity-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <ProgressBar step={step} />
        </div>
        <span className="text-xs text-[#94A3B8] font-medium w-10 text-right">{step} / 4</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 pb-12">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

// ── Step 1: Personal Details ──────────────────────────────────────────────────
function Step1({ data, onChange, onNext, error }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-[#4F6EF7] mb-3">STEP 1</p>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Personal Details
        </h1>
        <p className="text-[#475569]">Configure your administrator profile.</p>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] p-8 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#475569] tracking-wide mb-2 block">FIRST NAME</label>
            <input
              type="text"
              placeholder="John"
              value={data.firstName}
              onChange={e => onChange("firstName", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#475569] tracking-wide mb-2 block">LAST NAME</label>
            <input
              type="text"
              placeholder="Doe"
              value={data.lastName}
              onChange={e => onChange("lastName", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#475569] tracking-wide mb-2 block">PHONE NUMBER</label>
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={data.phone}
            onChange={e => onChange("phone", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
          />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={onNext}
          className="w-full py-3.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: PURPLE }}
        >
          Next Step <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Step 2: Industry ──────────────────────────────────────────────────────────
function Step2({ selected, onSelect, onNext, onBack, error }) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? SECTORS.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    : SECTORS;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest text-[#4F6EF7] mb-3">STEP 2</p>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          What's your trade?
        </h1>
        <p className="text-[#475569]">We'll customize AI responses for your industry.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search industries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-3 rounded-xl border border-black/[0.08] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6 max-h-[340px] overflow-y-auto pr-1">
        {filtered.map(sec => {
          const active = selected === sec.value;
          return (
            <button
              key={sec.value}
              onClick={() => onSelect(sec.value)}
              className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-center"
              style={{
                borderColor: active ? sec.color : "rgba(0,0,0,0.06)",
                backgroundColor: active ? sec.bg : "white",
              }}
            >
              <span className="text-2xl">{sec.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight" style={{ color: active ? sec.color : "#475569" }}>
                {sec.label}
              </span>
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: sec.color }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[#94A3B8] text-sm">No industries found</div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full py-3.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
        style={{ background: PURPLE }}
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ── Step 3: Service Type ──────────────────────────────────────────────────────
function Step3({ selected, onSelect, onNext, error }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-[#4F6EF7] mb-3">STEP 3</p>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          How do you serve customers?
        </h1>
        <p className="text-[#475569]">This helps us optimize your booking flow.</p>
      </div>

      <div className="space-y-3 mb-6">
        {SERVICE_TYPES.map(st => {
          const active = selected === st.value;
          return (
            <button
              key={st.value}
              onClick={() => onSelect(st.value)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left"
              style={{
                borderColor: active ? "#4F6EF7" : "rgba(0,0,0,0.06)",
                backgroundColor: active ? "#EEF2FF" : "white",
              }}
            >
              <span className="text-3xl">{st.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-[#0F172A]" style={{ color: active ? "#4F6EF7" : "#0F172A" }}>{st.label}</p>
                <p className="text-sm text-[#94A3B8] mt-0.5">{st.desc}</p>
              </div>
              {active && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: PURPLE }}>
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full py-3.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
        style={{ background: PURPLE }}
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ── Step 4: Business Setup ────────────────────────────────────────────────────
function Step4({ data, onChange, onComplete, loading, error }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-[#4F6EF7] mb-3">STEP 4</p>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Set up your business
        </h1>
        <p className="text-[#475569]">Configure booking parameters and AI behavior.</p>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] p-8 shadow-sm space-y-6">
        {/* Business name */}
        <div>
          <label className="text-xs font-semibold text-[#475569] tracking-wide mb-2 block">BUSINESS NAME</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.08] focus-within:ring-2 focus-within:ring-[#4F6EF7]/30 transition">
            <Building2 className="w-4 h-4 text-[#94A3B8] shrink-0" />
            <input
              type="text"
              placeholder="Ace Auto Repair"
              value={data.bizName}
              onChange={e => onChange("bizName", e.target.value)}
              className="flex-1 text-sm text-[#0F172A] focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Hours */}
        <div>
          <label className="text-xs font-semibold text-[#475569] tracking-wide mb-3 block">SERVICE HOURS</label>
          <div className="rounded-xl border border-black/[0.06] overflow-hidden">
            {DAYS.map((d, i) => {
              const row = data.hours[d.key];
              return (
                <div key={d.key} className={`flex items-center gap-4 px-4 py-3.5 ${i < DAYS.length - 1 ? "border-b border-black/[0.04]" : ""}`}>
                  {/* Toggle */}
                  <button
                    onClick={() => onChange("hours", { ...data.hours, [d.key]: { ...row, open: !row.open } })}
                    className="relative w-10 h-6 rounded-full transition-all shrink-0"
                    style={{ background: row.open ? PURPLE : "rgba(0,0,0,0.1)" }}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${row.open ? "left-5" : "left-1"}`} />
                  </button>
                  <span className="text-sm font-medium text-[#0F172A] w-20 shrink-0">{d.label}</span>
                  {row.open ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={row.start}
                        onChange={e => onChange("hours", { ...data.hours, [d.key]: { ...row, start: e.target.value } })}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-black/[0.08] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]/40"
                      />
                      <span className="text-xs text-[#94A3B8]">to</span>
                      <input
                        type="time"
                        value={row.end}
                        onChange={e => onChange("hours", { ...data.hours, [d.key]: { ...row, end: e.target.value } })}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-black/[0.08] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]/40"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-[#94A3B8] ml-auto">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom instructions */}
        <div>
          <label className="text-xs font-semibold text-[#475569] tracking-wide mb-2 block">
            CUSTOM AI INSTRUCTIONS <span className="font-normal text-[#94A3B8]">(optional)</span>
          </label>
          <textarea
            placeholder="e.g. Don't schedule same-day jobs. Always ask about vehicle year and make..."
            value={data.instructions}
            onChange={e => onChange("instructions", e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={onComplete}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: PURPLE }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Check className="w-4 h-4" /> Complete Setup</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step1, setStep1] = useState({ firstName: "", lastName: "", phone: "" });
  const [sector, setSector] = useState("");
  const [serviceLocation, setServiceLocation] = useState("");
  const [step4, setStep4] = useState({
    bizName: "",
    instructions: "",
    hours: {
      weekday:  { open: true,  start: "08:00", end: "17:00" },
      saturday: { open: false, start: "09:00", end: "14:00" },
      sunday:   { open: false, start: "10:00", end: "14:00" },
    },
  });

  function goNext() {
    setError("");
    if (step === 1) {
      if (!step1.firstName.trim()) { setError("First name is required"); return; }
      setStep(2);
    } else if (step === 2) {
      if (!sector) { setError("Please select your industry"); return; }
      setStep(3);
    } else if (step === 3) {
      if (!serviceLocation) { setError("Please select how you serve customers"); return; }
      setStep(4);
    }
  }

  async function complete() {
    setError("");
    if (!step4.bizName.trim()) { setError("Business name is required"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_URL}/api/business`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: step4.bizName.trim(),
          agent_type: sector,
          business_hours: buildHoursJson(step4.hours),
          custom_instructions: step4.instructions.trim() || null,
          service_location: serviceLocation,
        }),
      });
      window.location.href = "/dashboard";
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      step={step}
      onBack={step > 1 ? () => { setError(""); setStep(step - 1); } : null}
    >
      <AnimatePresence mode="wait">
        {step === 1 && (
          <Step1
            key="step1"
            data={step1}
            onChange={(k, v) => setStep1(prev => ({ ...prev, [k]: v }))}
            onNext={goNext}
            error={error}
          />
        )}
        {step === 2 && (
          <Step2
            key="step2"
            selected={sector}
            onSelect={setSector}
            onNext={goNext}
            error={error}
          />
        )}
        {step === 3 && (
          <Step3
            key="step3"
            selected={serviceLocation}
            onSelect={setServiceLocation}
            onNext={goNext}
            error={error}
          />
        )}
        {step === 4 && (
          <Step4
            key="step4"
            data={step4}
            onChange={(k, v) => setStep4(prev => ({ ...prev, [k]: v }))}
            onComplete={complete}
            loading={loading}
            error={error}
          />
        )}
      </AnimatePresence>
    </OnboardingLayout>
  );
}

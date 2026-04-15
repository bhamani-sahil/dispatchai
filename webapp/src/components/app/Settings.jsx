import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2, Clock, Bot, Wrench, FileText,
  Plus, Trash2, Loader2, Check, ChevronDown,
} from "lucide-react";
import { api } from "../../lib/api";

const PURPLE = "linear-gradient(135deg, #4F6EF7, #7C5CFC)";

const DAYS = [
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
  { key: "saturday",  label: "Saturday" },
  { key: "sunday",    label: "Sunday" },
];

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-6 rounded-full transition-all shrink-0"
      style={{ background: value ? PURPLE : "rgba(0,0,0,0.1)" }}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-1"}`} />
    </button>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.1), rgba(124,92,252,0.08))" }}>
          <Icon className="w-4 h-4 text-[#4F6EF7]" />
        </div>
        <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SaveButton({ onClick, saving, saved }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-5 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 transition hover:opacity-90 disabled:opacity-60"
      style={{ background: PURPLE }}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
      {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
    </button>
  );
}

export default function Settings() {
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile state
  const [profile, setProfile] = useState({ name: "", phone: "", service_area: "", agent_name: "", max_bookings_per_slot: 1 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  // Hours state
  const [hours, setHours] = useState({});
  const [savingHours, setSavingHours] = useState(false);
  const [savedHours, setSavedHours] = useState(false);

  // Instructions state
  const [instructions, setInstructions] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [savedInstructions, setSavedInstructions] = useState(false);

  // Agent toggle
  const [agentActive, setAgentActive] = useState(true);
  const [togglingAgent, setTogglingAgent] = useState(false);

  // Services
  const [newService, setNewService] = useState({ name: "", flat_price: "", price_min: "", price_max: "" });
  const [addingService, setAddingService] = useState(false);
  const [showAddService, setShowAddService] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/business").catch(() => null),
      api.get("/api/business/services").catch(() => []),
    ]).then(([biz, svcs]) => {
      if (biz) {
        setBusiness(biz);
        setProfile({
          name: biz.name || "",
          phone: biz.phone || "",
          service_area: biz.service_area || "",
          agent_name: biz.agent_name || "Anna",
          max_bookings_per_slot: biz.max_bookings_per_slot || 1,
        });
        setAgentActive(biz.agent_active ?? true);
        setInstructions(biz.custom_instructions || "");
        const h = {};
        DAYS.forEach(d => {
          const val = biz.business_hours?.[d.key];
          h[d.key] = val ? { open: true, start: val.open || "08:00", end: val.close || "17:00" } : { open: false, start: "08:00", end: "17:00" };
        });
        setHours(h);
      }
      setServices(svcs || []);
    }).finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.put("/api/business", {
        name: profile.name,
        phone: profile.phone,
        service_area: profile.service_area,
        agent_name: profile.agent_name,
        max_bookings_per_slot: profile.max_bookings_per_slot,
      });
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveHours() {
    setSavingHours(true);
    const hoursJson = {};
    DAYS.forEach(d => {
      hoursJson[d.key] = hours[d.key]?.open
        ? { open: hours[d.key].start, close: hours[d.key].end }
        : null;
    });
    try {
      await api.put("/api/business", { business_hours: hoursJson });
      setSavedHours(true);
      setTimeout(() => setSavedHours(false), 2000);
    } finally {
      setSavingHours(false);
    }
  }

  async function saveInstructions() {
    setSavingInstructions(true);
    try {
      await api.put("/api/business", { custom_instructions: instructions });
      setSavedInstructions(true);
      setTimeout(() => setSavedInstructions(false), 2000);
    } finally {
      setSavingInstructions(false);
    }
  }

  async function toggleAgent() {
    setTogglingAgent(true);
    try {
      await api.put("/api/dashboard/agent-toggle", { active: !agentActive });
      setAgentActive(v => !v);
    } finally {
      setTogglingAgent(false);
    }
  }

  async function addService() {
    if (!newService.name.trim()) return;
    setAddingService(true);
    try {
      const payload = { name: newService.name.trim(), is_active: true };
      if (newService.flat_price) payload.flat_price = parseFloat(newService.flat_price);
      if (newService.price_min)  payload.price_min  = parseFloat(newService.price_min);
      if (newService.price_max)  payload.price_max  = parseFloat(newService.price_max);
      const svc = await api.post("/api/business/services", payload);
      setServices(prev => [...prev, svc]);
      setNewService({ name: "", flat_price: "", price_min: "", price_max: "" });
      setShowAddService(false);
    } finally {
      setAddingService(false);
    }
  }

  async function toggleService(id, current) {
    await api.put(`/api/business/services/${id}`, { is_active: !current });
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
  }

  async function deleteService(id) {
    await api.delete(`/api/business/services/${id}`);
    setServices(prev => prev.filter(s => s.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-[#4F6EF7]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">

      {/* AI Agent toggle */}
      <SectionCard icon={Bot} title="AI Agent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#0F172A]">Agent Active</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              When off, AI stops responding to new messages. Existing conversations are unaffected.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium" style={{ color: agentActive ? "#4F6EF7" : "#94A3B8" }}>
              {agentActive ? "ON" : "OFF"}
            </span>
            {togglingAgent
              ? <Loader2 className="w-4 h-4 animate-spin text-[#4F6EF7]" />
              : <Toggle value={agentActive} onChange={toggleAgent} />
            }
          </div>
        </div>
      </SectionCard>

      {/* Business Profile */}
      <SectionCard icon={Building2} title="Business Profile">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">BUSINESS NAME</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">CALLBACK PHONE</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">SERVICE AREA</label>
              <input
                type="text"
                value={profile.service_area}
                onChange={e => setProfile(p => ({ ...p, service_area: e.target.value }))}
                placeholder="e.g. Calgary, AB"
                className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">AI AGENT NAME</label>
              <input
                type="text"
                value={profile.agent_name}
                onChange={e => setProfile(p => ({ ...p, agent_name: e.target.value }))}
                placeholder="Anna"
                className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">NUMBER OF TECHS</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={profile.max_bookings_per_slot}
                  onChange={e => setProfile(p => ({ ...p, max_bookings_per_slot: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="w-24 px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
                />
                <p className="text-xs text-[#94A3B8]">techs available per time slot</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <SaveButton onClick={saveProfile} saving={savingProfile} saved={savedProfile} />
          </div>
        </div>
      </SectionCard>

      {/* Business Hours */}
      <SectionCard icon={Clock} title="Business Hours">
        <div className="space-y-1 mb-4">
          {DAYS.map(d => {
            const row = hours[d.key] || { open: false, start: "08:00", end: "17:00" };
            return (
              <div key={d.key} className="flex items-center gap-4 py-2.5 border-b border-black/[0.04] last:border-0">
                <Toggle
                  value={row.open}
                  onChange={v => setHours(h => ({ ...h, [d.key]: { ...row, open: v } }))}
                />
                <span className="text-sm font-medium text-[#0F172A] w-24 shrink-0">{d.label}</span>
                {row.open ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="time"
                      value={row.start}
                      onChange={e => setHours(h => ({ ...h, [d.key]: { ...row, start: e.target.value } }))}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-black/[0.08] text-[#0F172A] focus:outline-none"
                    />
                    <span className="text-xs text-[#94A3B8]">to</span>
                    <input
                      type="time"
                      value={row.end}
                      onChange={e => setHours(h => ({ ...h, [d.key]: { ...row, end: e.target.value } }))}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-black/[0.08] text-[#0F172A] focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] ml-auto">Closed</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <SaveButton onClick={saveHours} saving={savingHours} saved={savedHours} />
        </div>
      </SectionCard>

      {/* Services */}
      <SectionCard icon={Wrench} title="Services & Pricing">
        <div className="space-y-2 mb-4">
          {services.length === 0 && (
            <p className="text-sm text-[#94A3B8] py-2">No services added yet.</p>
          )}
          {services.map(svc => (
            <div key={svc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.06] bg-[#F8F9FE]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F172A]">{svc.name}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {svc.flat_price
                    ? `$${svc.flat_price} flat`
                    : svc.price_min && svc.price_max
                    ? `$${svc.price_min}–$${svc.price_max}`
                    : svc.price_min
                    ? `From $${svc.price_min}`
                    : "No price set"}
                </p>
              </div>
              <Toggle value={svc.is_active} onChange={() => toggleService(svc.id, svc.is_active)} />
              <button
                onClick={() => deleteService(svc.id)}
                className="text-[#CBD5E1] hover:text-red-400 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add service */}
        {showAddService ? (
          <div className="border border-[#4F6EF7]/20 rounded-xl p-4 bg-[#EEF2FF] space-y-3">
            <input
              type="text"
              placeholder="Service name (e.g. Brake Inspection)"
              value={newService.name}
              onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-black/[0.08] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-[#475569] tracking-wide mb-1 block">FLAT PRICE</label>
                <input
                  type="number"
                  placeholder="$0"
                  value={newService.flat_price}
                  onChange={e => setNewService(p => ({ ...p, flat_price: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] text-sm bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#475569] tracking-wide mb-1 block">MIN PRICE</label>
                <input
                  type="number"
                  placeholder="$0"
                  value={newService.price_min}
                  onChange={e => setNewService(p => ({ ...p, price_min: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] text-sm bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#475569] tracking-wide mb-1 block">MAX PRICE</label>
                <input
                  type="number"
                  placeholder="$0"
                  value={newService.price_max}
                  onChange={e => setNewService(p => ({ ...p, price_max: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] text-sm bg-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addService}
                disabled={addingService || !newService.name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition"
                style={{ background: PURPLE }}
              >
                {addingService ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Add Service
              </button>
              <button
                onClick={() => setShowAddService(false)}
                className="px-4 py-2 rounded-lg text-sm text-[#475569] hover:bg-black/[0.05] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddService(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#4F6EF7]/30 text-sm text-[#4F6EF7] hover:bg-[#EEF2FF] transition w-full justify-center"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        )}
      </SectionCard>

      {/* Custom Instructions */}
      <SectionCard icon={FileText} title="AI Instructions">
        <div className="space-y-4">
          <p className="text-xs text-[#94A3B8]">
            Tell the AI how to handle specific situations, what to avoid, or anything unique about your business.
          </p>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={5}
            placeholder="e.g. Don't book same-day jobs. Always ask about vehicle year and model. Never quote under $100..."
            className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition resize-none"
          />
          <div className="flex justify-end">
            <SaveButton onClick={saveInstructions} saving={savingInstructions} saved={savedInstructions} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

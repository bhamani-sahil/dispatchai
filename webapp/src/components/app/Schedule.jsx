import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Loader2, MapPin, Briefcase, Phone,
  Ban, CheckCircle2, UserX, Send, Trash2, ChevronDown,
  ChevronLeft, ChevronRight, Clock,
} from "lucide-react";
import { api } from "../../lib/api";

const PURPLE = "linear-gradient(135deg, #4F6EF7, #7C5CFC)";
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_META = {
  booked:    { label: "Booked",    color: "#4F6EF7", bg: "#EEF2FF" },
  assigned:  { label: "Assigned",  color: "#8B5CF6", bg: "#F3E8FF" },
  completed: { label: "Completed", color: "#10B981", bg: "#D1FAE5" },
  blocked:   { label: "Blocked",   color: "#6B7280", bg: "#F1F5F9" },
  no_show:   { label: "No Show",   color: "#EF4444", bg: "#FEE2E2" },
  cancelled: { label: "Cancelled", color: "#94A3B8", bg: "#F8FAFC" },
};

function getWeekDates() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// ── Date Picker ───────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function DatePicker({ value, onChange }) {
  const today = new Date();
  const initDate = value ? new Date(value + "T12:00:00") : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const selected = value ? new Date(value + "T12:00:00") : null;

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function selectDay(day) {
    if (!day) return;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
  }

  function isSelected(day) {
    if (!day || !selected) return false;
    return selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;
  }

  function isToday(day) {
    return day && today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  function isPast(day) {
    if (!day) return false;
    const d = new Date(viewYear, viewMonth, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  }

  return (
    <div className="rounded-xl border border-black/[0.08] overflow-hidden bg-white">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
        <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition text-[#475569]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-[#0F172A]">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition text-[#475569]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 pt-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#94A3B8] pb-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-2">
        {cells.map((day, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!day || isPast(day)}
            onClick={() => selectDay(day)}
            className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all font-medium
              ${!day ? "" : isPast(day) ? "text-[#CBD5E1] cursor-not-allowed" :
                isSelected(day) ? "text-white" :
                isToday(day) ? "border border-[#4F6EF7] text-[#4F6EF7] hover:bg-[#EEF2FF]" :
                "text-[#334155] hover:bg-[#F1F5F9]"
              }`}
            style={isSelected(day) ? { background: PURPLE } : {}}
          >
            {day || ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Time Picker ───────────────────────────────────────────────────────────────
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 7; h <= 20; h++) {
    ["00", "30"].forEach(m => {
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      slots.push({ value: `${String(h).padStart(2,"0")}:${m}`, label: `${hour12}:${m} ${ampm}` });
    });
  }
  return slots;
})();

function TimePicker({ value, onChange }) {
  return (
    <div className="rounded-xl border border-black/[0.08] overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/[0.06]">
        <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
        <span className="text-xs font-semibold text-[#475569]">SELECT TIME</span>
      </div>
      <div className="overflow-y-auto max-h-44 grid grid-cols-2">
        {TIME_SLOTS.map(slot => (
          <button
            key={slot.value}
            type="button"
            onClick={() => onChange(slot.value)}
            className="px-3 py-2 text-xs font-medium transition-all text-left"
            style={value === slot.value
              ? { background: PURPLE, color: "white" }
              : { color: "#475569" }
            }
          >
            {slot.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Add Booking / Block Time Modal ────────────────────────────────────────────
function AddModal({ onClose, onSaved, prefillDate }) {
  const [mode, setMode] = useState("booking"); // "booking" | "block"
  const [form, setForm] = useState({
    slot_date: prefillDate || "",
    slot_time: "",
    customer_phone: "",
    customer_address: "",
    job_summary: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.slot_date || !form.slot_time) { setError("Date and time are required."); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/calendar/bookings", {
        slot_date: form.slot_date,
        slot_time: form.slot_time,
        customer_phone: mode === "block" ? null : form.customer_phone || null,
        customer_address: mode === "block" ? null : form.customer_address || null,
        job_summary: mode === "block" ? "Blocked" : form.job_summary || null,
        status: mode === "block" ? "blocked" : "booked",
        period: "morning",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0F172A]">
            {mode === "block" ? "Block Time" : "Add Booking"}
          </h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-5 p-1 bg-[#F1F5F9] rounded-xl">
          {["booking", "block"].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={mode === m ? { background: PURPLE, color: "white" } : { color: "#475569" }}>
              {m === "booking" ? "Manual Booking" : "Block Time"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Selected date+time summary pill */}
          {(form.slot_date || form.slot_time) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.08), rgba(124,92,252,0.06))", color: "#4F6EF7" }}>
              <span>{form.slot_date ? new Date(form.slot_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date"}</span>
              {form.slot_time && <><span className="opacity-40">·</span><span>{TIME_SLOTS.find(s => s.value === form.slot_time)?.label || form.slot_time}</span></>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">DATE</label>
              <DatePicker value={form.slot_date} onChange={v => setForm(p => ({ ...p, slot_date: v }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">TIME</label>
              <TimePicker value={form.slot_time} onChange={v => setForm(p => ({ ...p, slot_time: v }))} />
            </div>
          </div>

          {mode === "booking" && (
            <>
              <div>
                <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">CUSTOMER PHONE</label>
                <input type="tel" placeholder="+1 (555) 000-0000" value={form.customer_phone}
                  onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">ADDRESS (optional)</label>
                <input type="text" placeholder="123 Main St NW" value={form.customer_address}
                  onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">JOB SUMMARY (optional)</label>
                <input type="text" placeholder="Brake inspection + repair" value={form.job_summary}
                  onChange={e => setForm(p => ({ ...p, job_summary: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30" />
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60 mt-2"
            style={{ background: PURPLE }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "block" ? "Block Time" : "Add Booking"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Booking Detail Modal ──────────────────────────────────────────────────────
function BookingModal({ booking, onClose, onUpdated }) {
  const [techPhone, setTechPhone] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [forwardError, setForwardError] = useState("");
  const [forwardSuccess, setForwardSuccess] = useState(false);

  const meta = STATUS_META[booking.status] || STATUS_META.booked;

  async function updateStatus(status) {
    setUpdating(true);
    try {
      await api.put(`/api/calendar/bookings/${booking.id}/status`, { status });
      onUpdated();
      onClose();
    } finally {
      setUpdating(false);
    }
  }

  async function deleteBlocked() {
    setUpdating(true);
    try {
      await api.delete(`/api/calendar/bookings/${booking.id}`);
      onUpdated();
      onClose();
    } finally {
      setUpdating(false);
    }
  }

  async function forwardToTech() {
    if (!techPhone.trim()) return;
    setForwarding(true);
    setForwardError("");
    try {
      await api.post("/api/calendar/forward-tech", {
        booking_id: booking.id,
        tech_phone: techPhone.trim(),
      });
      setForwardSuccess(true);
      onUpdated();
      setTimeout(() => { onClose(); }, 1500);
    } catch (e) {
      setForwardError(e.message || "Failed to forward.");
    } finally {
      setForwarding(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">
              {booking.status === "blocked" ? "Blocked Time" : "Booking Details"}
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{ background: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F9FE]">
            <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.1), rgba(124,92,252,0.08))" }}>
              <span className="text-[10px] font-bold text-[#4F6EF7]">{booking.slot_date?.slice(5)}</span>
              <span className="text-[9px] text-[#94A3B8]">{booking.slot_time?.split("-")[0]}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{booking.slot_date} · {booking.slot_time}</p>
            </div>
          </div>
          {booking.customer_phone && (
            <div className="flex items-center gap-2.5 text-sm text-[#475569]">
              <Phone className="w-4 h-4 text-[#94A3B8] shrink-0" />
              {booking.customer_phone}
            </div>
          )}
          {booking.customer_address && (
            <div className="flex items-center gap-2.5 text-sm text-[#475569]">
              <MapPin className="w-4 h-4 text-[#94A3B8] shrink-0" />
              {booking.customer_address}
            </div>
          )}
          {booking.job_summary && booking.job_summary !== "Blocked" && (
            <div className="flex items-center gap-2.5 text-sm text-[#475569]">
              <Briefcase className="w-4 h-4 text-[#94A3B8] shrink-0" />
              {booking.job_summary}
            </div>
          )}
        </div>

        {/* Actions */}
        {booking.status === "blocked" ? (
          <button onClick={deleteBlocked} disabled={updating}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-2">
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remove Block
          </button>
        ) : (
          <div className="space-y-3">
            {/* Forward to tech */}
            {(booking.status === "booked" || booking.status === "assigned") && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#475569] tracking-wide block">FORWARD TO TECH</label>
                <div className="flex gap-2">
                  <input type="tel" placeholder="Tech phone number" value={techPhone}
                    onChange={e => setTechPhone(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-black/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30" />
                  <button onClick={forwardToTech} disabled={forwarding || !techPhone.trim()}
                    className="px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                    style={{ background: PURPLE }}>
                    {forwarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {forwardSuccess ? "Sent!" : "Send"}
                  </button>
                </div>
                {forwardError && <p className="text-xs text-red-500">{forwardError}</p>}
              </div>
            )}

            {/* Status buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {booking.status !== "completed" && (
                <button onClick={() => updateStatus("completed")} disabled={updating}
                  className="py-2 rounded-xl text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </button>
              )}
              {booking.status !== "no_show" && (
                <button onClick={() => updateStatus("no_show")} disabled={updating}
                  className="py-2 rounded-xl text-xs font-medium text-orange-500 bg-orange-50 hover:bg-orange-100 transition flex items-center justify-center gap-1">
                  <UserX className="w-3.5 h-3.5" /> No Show
                </button>
              )}
              {booking.status !== "cancelled" && (
                <button onClick={() => updateStatus("cancelled")} disabled={updating}
                  className="py-2 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-1">
                  <Ban className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ── Modal overlay ─────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Schedule ─────────────────────────────────────────────────────────────
export default function Schedule() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [prefillDate, setPrefillDate] = useState("");

  const load = useCallback(() => {
    api.get("/api/calendar/bookings")
      .then(data => setBookings(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const weekDates = getWeekDates();
  const today = new Date().toDateString();

  function bookingsForDate(date) {
    const iso = date.toISOString().slice(0, 10);
    return bookings.filter(b => b.slot_date === iso && b.status !== "cancelled");
  }

  function openAdd(date) {
    setPrefillDate(date ? date.toISOString().slice(0, 10) : "");
    setShowAdd(true);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0F172A]">This Week</h2>
        <button onClick={() => openAdd(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
          style={{ background: PURPLE }}>
          <Plus className="w-4 h-4" /> Add Booking
        </button>
      </div>

      {/* Weekly grid — desktop only */}
      <div className="hidden sm:block bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-black/[0.05]">
          {weekDates.map((date, i) => {
            const isToday = date.toDateString() === today;
            return (
              <button key={i} onClick={() => openAdd(date)}
                className="flex flex-col items-center py-3 px-1 hover:bg-black/[0.02] transition group">
                <span className="text-xs text-[#94A3B8] mb-1">{WEEK[i]}</span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                  isToday ? "text-white" : "text-[#0F172A] group-hover:bg-[#EEF2FF] group-hover:text-[#4F6EF7]"
                }`}
                  style={isToday ? { background: PURPLE } : {}}>
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#4F6EF7]" />
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-[240px]">
            {weekDates.map((date, i) => {
              const dayBookings = bookingsForDate(date);
              const isToday = date.toDateString() === today;
              return (
                <div key={i} className={`p-1.5 border-r border-black/[0.04] last:border-r-0 ${isToday ? "bg-[#F8F9FF]" : ""}`}>
                  {dayBookings.map(b => {
                    const meta = STATUS_META[b.status] || STATUS_META.booked;
                    return (
                      <button key={b.id} onClick={() => setSelectedBooking(b)}
                        className="w-full mb-1.5 p-2 rounded-lg text-left text-[10px] leading-tight transition hover:opacity-80"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}20` }}>
                        <p className="font-semibold" style={{ color: meta.color }}>{b.slot_time?.split("-")[0]}</p>
                        <p className="text-[#475569] truncate mt-0.5">
                          {b.status === "blocked" ? "Blocked" : b.customer_phone?.slice(-7)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile week strip */}
      <div className="sm:hidden bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
        <div className="flex border-b border-black/[0.05] overflow-x-auto">
          {weekDates.map((date, i) => {
            const isToday = date.toDateString() === today;
            const count = bookingsForDate(date).length;
            return (
              <button key={i} onClick={() => openAdd(date)}
                className="flex flex-col items-center py-3 px-3 shrink-0 hover:bg-black/[0.02] transition">
                <span className="text-[10px] text-[#94A3B8] mb-1">{WEEK[i]}</span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  isToday ? "text-white" : "text-[#0F172A]"
                }`} style={isToday ? { background: PURPLE } : {}}>
                  {date.getDate()}
                </span>
                {count > 0 && (
                  <span className="mt-1 w-1.5 h-1.5 rounded-full" style={{ background: "#4F6EF7" }} />
                )}
              </button>
            );
          })}
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-[#4F6EF7]" />
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {weekDates.flatMap(date => bookingsForDate(date).map(b => ({ ...b, _date: date }))).length === 0 ? (
              <p className="py-8 text-center text-sm text-[#94A3B8]">No bookings this week</p>
            ) : (
              weekDates.flatMap(date => bookingsForDate(date).map(b => {
                const meta = STATUS_META[b.status] || STATUS_META.booked;
                return (
                  <button key={b.id} onClick={() => setSelectedBooking(b)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition text-left">
                    <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: meta.bg }}>
                      <span className="text-[9px] font-bold" style={{ color: meta.color }}>{b.slot_date?.slice(5)}</span>
                      <span className="text-[8px] text-[#94A3B8]">{b.slot_time?.split(":").slice(0,2).join(":")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {b.status === "blocked" ? "Blocked" : b.customer_phone}
                      </p>
                      {b.job_summary && b.job_summary !== "Blocked" && (
                        <p className="text-xs text-[#94A3B8] truncate">{b.job_summary}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full shrink-0"
                      style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                  </button>
                );
              }))
            )}
          </div>
        )}
      </div>

      {/* Booking list */}
      <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F172A]">All Bookings</h2>
          <span className="text-xs text-[#94A3B8]">{bookings.filter(b => b.status !== "cancelled").length} active</span>
        </div>
        {bookings.filter(b => b.status !== "cancelled").length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No bookings yet</div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {bookings.filter(b => b.status !== "cancelled").map(b => {
              const meta = STATUS_META[b.status] || STATUS_META.booked;
              return (
                <button key={b.id} onClick={() => setSelectedBooking(b)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition text-left">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: meta.bg }}>
                    <span className="text-[10px] font-bold" style={{ color: meta.color }}>{b.slot_date?.slice(5)}</span>
                    <span className="text-[9px] text-[#94A3B8]">{b.slot_time?.split("-")[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-[#0F172A]">
                      {b.status === "blocked" ? "Blocked Time" : b.customer_phone}
                    </p>
                    {b.customer_address && (
                      <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{b.customer_address}</span>
                      </div>
                    )}
                    {b.job_summary && b.job_summary !== "Blocked" && (
                      <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                        <Briefcase className="w-3 h-3" />
                        <span className="truncate">{b.job_summary}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddModal
          prefillDate={prefillDate}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}
      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}

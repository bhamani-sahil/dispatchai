import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, Calendar, Zap, Settings as SettingsIcon,
  LogOut, Menu, X, Bot, TrendingUp, Clock, Star,
  Phone, MapPin, Briefcase, RefreshCw, Send, UserCheck,
  UserX, ChevronRight, AlertCircle, CheckCircle2, Circle,
  Plus, Loader2, Download, FileText,
} from "lucide-react";
import { api } from "../../lib/api";
import Settings from "./Settings";
import Schedule from "./Schedule";

const PURPLE = "linear-gradient(135deg, #4F6EF7, #7C5CFC)";

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",     label: "Overview",     icon: LayoutDashboard },
  { id: "inbox",        label: "Inbox",        icon: MessageSquare },
  { id: "schedule",     label: "Schedule",     icon: Calendar },
  { id: "intelligence", label: "Intelligence", icon: Zap },
  { id: "settings",     label: "Settings",     icon: SettingsIcon },
];

function Sidebar({ active, onNav, onLogout, mobileOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-60 z-40 flex flex-col
        bg-white border-r border-black/[0.06]
        transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-black/[0.05]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: PURPLE }}>
            <span className="text-white text-xs font-bold">CD</span>
          </div>
          <span className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            CueDesk
          </span>
          <button onClick={onClose} className="ml-auto lg:hidden text-[#94A3B8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNav(item.id); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-white"
                    : "text-[#475569] hover:text-[#0F172A] hover:bg-black/[0.04]"
                }`}
                style={isActive ? { background: PURPLE } : {}}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-black/[0.05]">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function Topbar({ title, onMenuClick }) {
  return (
    <div className="h-16 border-b border-black/[0.05] flex items-center px-6 gap-4 bg-white">
      <button onClick={onMenuClick} className="lg:hidden text-[#475569]">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {title}
      </h1>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent, bg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-black/[0.05] shadow-sm"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <span className="text-sm text-[#475569]">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-[#0F172A]">{value ?? "—"}</p>
    </motion.div>
  );
}

function OverviewTab() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("this_week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/dashboard?period=${period}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const periods = [
    { value: "today",      label: "Today" },
    { value: "this_week",  label: "7 Days" },
    { value: "this_month", label: "Month" },
    { value: "all_time",   label: "All" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Period pills */}
      <div className="flex gap-2">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={period === p.value
              ? { background: PURPLE, color: "white" }
              : { background: "rgba(0,0,0,0.04)", color: "#475569" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-[#4F6EF7]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Revenue"   value={data?.revenue_converted ? `$${data.revenue_converted}` : "$0"}     accent="#4F6EF7" bg="#EEF2FF" />
            <StatCard icon={Clock}      label="Time Saved" value={data?.time_saved_hours ? `${data.time_saved_hours}h` : "0h"}     accent="#8B5CF6" bg="#F3E8FF" />
            <StatCard icon={Calendar}   label="Bookings"  value={data?.total_bookings ?? 0}                                        accent="#10B981" bg="#D1FAE5" />
            <StatCard icon={Star}       label="AI Score"  value={data?.conversion_rate ? `${data.conversion_rate}%` : "—"}         accent="#F59E0B" bg="#FEF3C7" />
          </div>

          {/* Upcoming jobs */}
          <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.05]">
              <h2 className="text-sm font-semibold text-[#0F172A]">Upcoming Jobs</h2>
            </div>
            {data?.upcoming_jobs?.length ? (
              <div className="divide-y divide-black/[0.04]">
                {data.upcoming_jobs.map(job => (
                  <div key={job.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.08), rgba(124,92,252,0.06))" }}>
                      <span className="text-[10px] font-semibold text-[#4F6EF7]">{job.slot_date?.slice(5)}</span>
                      <span className="text-[9px] text-[#94A3B8]">{job.slot_time?.split("-")[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A]">{job.customer_phone}</p>
                      {job.job_summary && (
                        <p className="text-xs text-[#94A3B8] truncate mt-0.5">{job.job_summary}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                      Booked
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-[#94A3B8]">No upcoming jobs</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────────────────
function statusColor(s) {
  if (s === "human_takeover") return { dot: "#F59E0B", label: "Takeover", bg: "#FEF3C7" };
  if (s === "needs_review")   return { dot: "#EF4444", label: "Review",   bg: "#FEE2E2" };
  if (s === "closed")         return { dot: "#94A3B8", label: "Closed",   bg: "#F1F5F9" };
  return                             { dot: "#4F6EF7", label: "AI",       bg: "#EEF2FF" };
}

function InboxTab() {
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadConvos = useCallback(() => {
    api.get("/api/conversations").then(setConvos).catch(() => {});
  }, []);

  const loadMessages = useCallback((id) => {
    setLoadingMsgs(true);
    api.get(`/api/conversations/${id}/messages`)
      .then(setMessages)
      .finally(() => setLoadingMsgs(false));
  }, []);

  useEffect(() => {
    loadConvos();
    const t = setInterval(loadConvos, 8000);
    return () => clearInterval(t);
  }, [loadConvos]);

  useEffect(() => {
    if (!active) return;
    loadMessages(active.id);
    const t = setInterval(() => loadMessages(active.id), 8000);
    return () => clearInterval(t);
  }, [active, loadMessages]);

  async function sendReply() {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${active.id}/reply`, { body: reply.trim() });
      setReply("");
      loadMessages(active.id);
      loadConvos();
    } finally {
      setSending(false);
    }
  }

  async function takeover() {
    await api.put(`/api/conversations/${active.id}/takeover`);
    loadConvos();
    setActive(c => ({ ...c, status: "human_takeover" }));
  }

  async function handback() {
    await api.put(`/api/conversations/${active.id}/handback`);
    loadConvos();
    setActive(c => ({ ...c, status: "ai_handling" }));
  }

  const sc = active ? statusColor(active.status) : null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Conversation list */}
      <div className={`w-full lg:w-72 shrink-0 border-r border-black/[0.05] overflow-y-auto bg-white ${active ? "hidden lg:block" : ""}`}>
        <div className="px-4 py-3 border-b border-black/[0.04]">
          <p className="text-xs font-semibold text-[#94A3B8] tracking-wide">CONVERSATIONS</p>
        </div>
        {convos.length === 0 && (
          <div className="p-6 text-center text-sm text-[#94A3B8]">No conversations yet</div>
        )}
        {convos.map(c => {
          const sc2 = statusColor(c.status);
          return (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.04] text-left transition-all hover:bg-black/[0.02] ${active?.id === c.id ? "bg-[#EEF2FF]" : ""}`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ background: PURPLE }}>
                {c.customer_phone?.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F172A] truncate">{c.customer_phone}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc2.dot }} />
                  <span className="text-xs text-[#94A3B8]">{sc2.label}</span>
                </div>
              </div>
              {c.ai_confidence != null && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: sc2.bg, color: sc2.dot }}>
                  {Math.round(c.ai_confidence * 100)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chat panel */}
      {active ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.05] bg-white shrink-0">
            <button onClick={() => setActive(null)} className="lg:hidden text-[#475569]">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{active.customer_phone}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                <span className="text-xs text-[#94A3B8]">{sc.label}</span>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              {active.status === "ai_handling" || active.status === "needs_review" ? (
                <button onClick={takeover}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
                  <UserCheck className="w-3.5 h-3.5" /> Take Over
                </button>
              ) : active.status === "human_takeover" ? (
                <button onClick={handback}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EEF2FF] text-[#4F6EF7] hover:bg-[#E0E7FF] transition">
                  <Bot className="w-3.5 h-3.5" /> Hand Back to AI
                </button>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
            style={{ background: "#F8F9FE" }}>
            {loadingMsgs && messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#4F6EF7]" />
              </div>
            ) : messages.map(m => {
              const isAI = m.sender_type === "ai_agent";
              const isOwner = m.sender_type === "owner";
              const isOut = isAI || isOwner;
              return (
                <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOut ? "text-white rounded-br-sm" : "text-[#334155] rounded-bl-sm"
                  }`}
                    style={isOut
                      ? { background: isOwner ? "#0F172A" : PURPLE }
                      : { background: "white", border: "1px solid rgba(0,0,0,0.06)" }
                    }>
                    {isOwner && <p className="text-[10px] opacity-60 mb-1">Owner</p>}
                    {m.body}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply box */}
          {active.status !== "closed" && (
            <div className="px-5 py-4 border-t border-black/[0.05] bg-white shrink-0">
              <div className="flex items-end gap-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type a reply..."
                  rows={2}
                  className="flex-1 px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 shrink-0"
                  style={{ background: PURPLE }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-sm text-[#94A3B8]">
          Select a conversation
        </div>
      )}
    </div>
  );
}

// ── Schedule tab ──────────────────────────────────────────────────────────────
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Intelligence tab ──────────────────────────────────────────────────────────
function IntelligenceTab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me anything about your business — bookings, revenue, availability, or how to handle a customer situation." }
  ]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await api.post("/api/brain/chat", { message: q });
      setMessages(prev => [...prev, {
        role: "assistant",
        text: res.response || "Got it.",
        pdf_url: res.pdf_url || null,
        doc: res.document || null,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I couldn't process that. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4" style={{ background: "#F8F9FE" }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mr-2.5 mt-0.5" style={{ background: PURPLE }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className="max-w-[72%] flex flex-col gap-2">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "text-white rounded-br-sm"
                  : "text-[#334155] rounded-bl-sm bg-white border border-black/[0.06]"
              }`}
                style={m.role === "user" ? { background: PURPLE } : {}}>
                {m.text}
              </div>
              {m.pdf_url && (
                <a
                  href={m.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.06), rgba(124,92,252,0.06))", borderColor: "rgba(79,110,247,0.2)", color: "#4F6EF7" }}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{m.doc?.title || "View Document"}</span>
                  <Download className="w-3.5 h-3.5 shrink-0" />
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mr-2.5" style={{ background: PURPLE }}>
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-black/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#4F6EF7]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-black/[0.05] bg-white">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder="Ask about your business..."
            rows={2}
            className="flex-1 px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition resize-none"
          />
          <button
            onClick={ask}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 shrink-0"
            style={{ background: PURPLE }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const TAB_TITLES = {
  overview:     "Overview",
  inbox:        "Inbox",
  schedule:     "Schedule",
  intelligence: "Intelligence",
  settings:     "Settings",
};

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get("/api/business")
      .then(() => setChecking(false))
      .catch(err => {
        // No business record — send to onboarding
        window.location.href = "/onboarding";
      });
  }, []);

  function logout() {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FE]">
        <Loader2 className="w-5 h-5 animate-spin text-[#4F6EF7]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FE] overflow-hidden">
      <Sidebar
        active={tab}
        onNav={setTab}
        onLogout={logout}
        mobileOpen={mobileMenu}
        onClose={() => setMobileMenu(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={TAB_TITLES[tab]} onMenuClick={() => setMobileMenu(true)} />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {tab === "overview"     && <OverviewTab />}
              {tab === "inbox"        && <InboxTab />}
              {tab === "schedule"     && <Schedule />}
              {tab === "intelligence" && <IntelligenceTab />}
              {tab === "settings"     && <Settings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MessageSquare, BarChart3, Check, ChevronLeft, ChevronRight, User } from "lucide-react";

/* ───── Screen 1: Brakes SMS ───── */
function SMSScreen1() {
  const msgs = [
    { side: "in", text: "Hey I need my brakes looked at", time: "2:14 PM" },
    { side: "out", text: "Hi there! Thanks for reaching out to Mike's Auto. We'd be happy to take a look at your brakes. A brake inspection is $45, and most repairs run $150–$280 depending on pads or rotors.", time: "2:14 PM" },
    { side: "out", text: "We have openings tomorrow at 9am or Thursday at 1pm — which works better for you?", time: "2:14 PM" },
    { side: "in", text: "Tomorrow 9am works!", time: "2:15 PM" },
    { side: "out", text: "You're booked for tomorrow at 9am. We'll text you a reminder. See you then!", time: "2:15 PM" },
  ];
  return (
    <PhoneFrame title="Mike's Auto" subtitle="AI Assistant">
      <ChatMessages msgs={msgs} />
    </PhoneFrame>
  );
}

/* ───── Screen 2: Missed Call SMS ───── */
function SMSScreen2() {
  const msgs = [
    { side: "in", text: "Hi I missed a call from this number", time: "10:32 AM" },
    { side: "out", text: "Hi! I'm Anna, QuickFix Tires' assistant — we saw you called! Can I help you book a tire repair or rotation?", time: "10:32 AM" },
    { side: "in", text: "Yeah I need two front tires replaced", time: "10:33 AM" },
    { side: "out", text: "Sure thing! For two front tires we have packages starting at $180. I have availability today at 3pm or tomorrow morning. What works?", time: "10:33 AM" },
    { side: "in", text: "Today at 3 would be great", time: "10:34 AM" },
  ];
  return (
    <PhoneFrame title="QuickFix Tires" subtitle="AI Assistant">
      <ChatMessages msgs={msgs} />
    </PhoneFrame>
  );
}

/* ───── Screen 3: Calendar Booking ───── */
function CalendarScreen() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hours = ["9:00", "10:00", "11:00", "12:00", "1:00", "2:00"];
  return (
    <PhoneFrame title="Bookings" subtitle="This Week" showCalIcon>
      <div className="px-3 pt-2 pb-1">
        {/* Week header */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {days.map((d, i) => (
            <div key={d} className={`text-center py-1.5 rounded-lg text-[10px] font-medium ${i === 2 ? "bg-[#4F6EF7] text-white" : "text-[#94A3B8]"}`}>
              <div>{d}</div>
              <div className="text-[11px] mt-0.5">{14 + i}</div>
            </div>
          ))}
        </div>
        {/* Time slots */}
        <div className="space-y-1">
          {hours.map((h, i) => (
            <div key={h} className="flex items-center gap-2">
              <span className="text-[9px] text-[#94A3B8] w-8 shrink-0 font-mono">{h}</span>
              {i === 1 ? (
                <div className="flex-1 rounded-lg px-2.5 py-2 text-[10px]"
                  style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.08), rgba(151,117,250,0.06))", border: "1px solid rgba(79,110,247,0.15)" }}>
                  <div className="font-medium text-[#0F172A]">Sarah M. — Brake Repair</div>
                  <div className="text-[#94A3B8] mt-0.5">10:00 AM · Mike's Auto</div>
                </div>
              ) : i === 4 ? (
                <div className="flex-1 rounded-lg px-2.5 py-2 text-[10px]"
                  style={{ background: "rgba(151,117,250,0.06)", border: "1px solid rgba(151,117,250,0.12)" }}>
                  <div className="font-medium text-[#0F172A]">James K. — Tire Replace</div>
                  <div className="text-[#94A3B8] mt-0.5">1:00 PM · QuickFix Tires</div>
                </div>
              ) : (
                <div className="flex-1 h-8 rounded-lg border border-black/[0.03]" />
              )}
            </div>
          ))}
        </div>
        {/* Booking summary card */}
        <div className="mt-3 rounded-xl p-3 border border-black/[0.05]" style={{ background: "#F8F9FE" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }}>SM</div>
            <div>
              <div className="text-[11px] font-medium text-[#0F172A]">Sarah Martinez</div>
              <div className="text-[9px] text-[#94A3B8]">Brake inspection + repair</div>
            </div>
            <div className="ml-auto">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-[9px] text-[#94A3B8]">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Wed 10:00 AM</span>
            <span>$150–$280</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ───── Screen 4: Dashboard ───── */
function DashboardScreen() {
  const stats = [
    { label: "Bookings Today", value: "7", change: "+3", icon: Calendar },
    { label: "Messages Handled", value: "24", change: "+12", icon: MessageSquare },
    { label: "Time Saved", value: "4.2h", change: "", icon: Clock },
    { label: "Response Rate", value: "98%", change: "", icon: BarChart3 },
  ];
  return (
    <PhoneFrame title="Dashboard" subtitle="Today's Overview" showDashIcon>
      <div className="px-3 pt-2 space-y-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-3 border border-black/[0.04] flex items-center gap-3"
              style={{ background: "#F8F9FE" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.1), rgba(151,117,250,0.08))" }}>
                <Icon className="w-4 h-4 text-[#4F6EF7]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-[#94A3B8]">{s.label}</div>
                <div className="text-base font-semibold text-[#0F172A] leading-tight">{s.value}</div>
              </div>
              {s.change && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {s.change}
                </span>
              )}
            </div>
          );
        })}
        {/* Mini chart area */}
        <div className="rounded-xl p-3 border border-black/[0.04]" style={{ background: "#F8F9FE" }}>
          <div className="text-[10px] text-[#94A3B8] mb-2">Bookings This Week</div>
          <div className="flex items-end gap-1.5 h-12">
            {[3, 5, 4, 7, 6, 8, 5].map((v, i) => (
              <div key={i} className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${(v / 8) * 100}%`,
                  background: i === 5
                    ? "linear-gradient(to top, #4F6EF7, #9775FA)"
                    : "rgba(0,0,0,0.05)",
                }} />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[8px] text-[#CBD5E1]">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ───── Shared Phone Frame ───── */
function PhoneFrame({ children, title, subtitle, showCalIcon, showDashIcon }) {
  return (
    <div className="phone-mockup w-full max-w-[320px] mx-auto overflow-hidden">
      {/* Status bar */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[11px] text-[#94A3B8] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>9:41</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2.5 rounded-sm border border-[#CBD5E1] flex items-end p-[1px]">
            <div className="w-full h-[60%] bg-[#94A3B8] rounded-[1px]" />
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="px-5 pb-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }}>
            {showCalIcon ? <Calendar className="w-4 h-4" /> : showDashIcon ? <BarChart3 className="w-4 h-4" /> : "CD"}
          </div>
          <div>
            <p className="text-sm font-medium text-[#0F172A]">{title}</p>
            <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="min-h-[340px] max-h-[340px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ───── Shared Chat Messages ───── */
function ChatMessages({ msgs }) {
  return (
    <div className="px-3.5 py-3 flex flex-col gap-2">
      {msgs.map((m, i) => (
        <div key={i} className={`flex ${m.side === "out" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] px-3 py-2 text-[12.5px] leading-relaxed ${
            m.side === "out"
              ? "rounded-2xl rounded-br-sm text-white"
              : "rounded-2xl rounded-bl-sm text-[#334155]"
          }`}
            style={m.side === "out"
              ? { background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }
              : { background: "#F1F0FB", border: "1px solid rgba(151, 117, 250, 0.12)" }
            }
          >
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───── Navigation dots ───── */
function CarouselDots({ count, active }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === active ? 24 : 6,
            background: i === active
              ? "linear-gradient(135deg, #4F6EF7, #9775FA)"
              : "rgba(0,0,0,0.08)",
          }}
        />
      ))}
    </div>
  );
}

/* ───── Main Carousel Export ───── */
const screens = [SMSScreen1, SMSScreen2, CalendarScreen, DashboardScreen];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    setDirection(1);
    setActive((prev) => (prev + 1) % screens.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 3500);
    return () => clearInterval(timer);
  }, [next]);

  const Screen = screens[active];

  const variants = {
    enter: (dir) => ({
      opacity: 0,
      scale: 0.92,
      x: dir > 0 ? 40 : -40,
    }),
    center: {
      opacity: 1,
      scale: 1,
      x: 0,
    },
    exit: (dir) => ({
      opacity: 0,
      scale: 0.92,
      x: dir > 0 ? -40 : 40,
    }),
  };

  return (
    <div data-testid="hero-carousel" className="flex flex-col items-center w-[320px]">
      <div className="relative w-[320px] h-[470px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-[320px] h-[470px]"
          >
            <Screen />
          </motion.div>
        </AnimatePresence>
      </div>
      <CarouselDots count={screens.length} active={active} />
    </div>
  );
}

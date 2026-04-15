import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const messages = [
  { type: "system", text: "Missed call from (555) 012-3456", delay: 0 },
  { type: "outgoing", text: "Hi! Thanks for calling Ace Plumbing. Sorry we missed you — how can we help?", delay: 1200 },
  { type: "incoming", text: "Hey! I have a leaking faucet in my kitchen. Can someone come take a look?", delay: 3000 },
  { type: "outgoing", text: "Absolutely! A kitchen faucet repair runs $85–$120. We have openings tomorrow at 10am or 2pm — which works better?", delay: 5000 },
  { type: "incoming", text: "2pm tomorrow works perfectly!", delay: 7000 },
  { type: "outgoing", text: "You're all set! Booked for tomorrow at 2pm. We'll send a confirmation shortly. Anything else?", delay: 8500 },
];

export default function SMSDemo() {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [typingSide, setTypingSide] = useState("outgoing");
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    setVisibleMessages([]);
    const timers = [];

    messages.forEach((msg, i) => {
      // Show typing indicator before message
      if (i > 0) {
        timers.push(
          setTimeout(() => {
            setTyping(true);
            setTypingSide(msg.type === "incoming" ? "incoming" : "outgoing");
          }, msg.delay - 800)
        );
      }

      timers.push(
        setTimeout(() => {
          setTyping(false);
          setVisibleMessages((prev) => [...prev, msg]);
        }, msg.delay)
      );
    });

    // Restart the cycle
    timers.push(
      setTimeout(() => {
        setCycleKey((k) => k + 1);
      }, 12000)
    );

    return () => timers.forEach(clearTimeout);
  }, [cycleKey]);

  return (
    <div className="phone-mockup w-full max-w-[320px] mx-auto overflow-hidden" data-testid="sms-demo">
      {/* Phone status bar */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[11px] text-white/50 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>9:41</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2.5 rounded-sm border border-white/30 flex items-end p-[1px]">
            <div className="w-full h-[60%] bg-white/40 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Contact header */}
      <div className="px-5 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }}>
            CD
          </div>
          <div>
            <p className="text-sm font-medium text-white">CueDesk AI</p>
            <p className="text-[11px] text-white/40">Ace Plumbing</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="px-4 py-4 flex flex-col gap-2.5 min-h-[340px] max-h-[340px] overflow-hidden">
        {visibleMessages.map((msg, i) => (
          <motion.div
            key={`${cycleKey}-${i}`}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`flex ${msg.type === "outgoing" ? "justify-end" : msg.type === "system" ? "justify-center" : "justify-start"}`}
          >
            {msg.type === "system" ? (
              <span className="text-[10px] text-white/40 bg-white/[0.06] px-3 py-1 rounded-full">
                {msg.text}
              </span>
            ) : (
              <div
                className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.type === "outgoing"
                    ? "chat-bubble-outgoing text-white"
                    : "chat-bubble-incoming text-white/90"
                }`}
              >
                {msg.text}
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex ${typingSide === "outgoing" ? "justify-end" : "justify-start"}`}
          >
            <div className={`px-4 py-3 ${
              typingSide === "outgoing"
                ? "chat-bubble-outgoing"
                : "chat-bubble-incoming"
            }`}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 typing-dot" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

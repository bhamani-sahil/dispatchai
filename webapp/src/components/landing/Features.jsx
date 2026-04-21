import { motion } from "framer-motion";
import { Brain, CalendarCheck, MessageSquareText, DollarSign, FileText, Handshake, Check } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Business Intelligence",
    description: "Knows your services, pricing, hours, and service area. Answers customer questions like a trained employee — without you lifting a finger.",
    bullets: ["Trained on your business info", "Handles FAQs automatically", "Updates instantly when you edit settings"],
    span: "md:col-span-4 lg:col-span-8",
  },
  {
    icon: CalendarCheck,
    title: "Smart Booking",
    description: "Schedules appointments directly into your calendar with a full job summary attached.",
    bullets: ["Checks your availability in real time", "Sends booking confirmation to customer", "Summary attached to every job"],
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: MessageSquareText,
    title: "Natural Conversations",
    description: "Talks like a real person over SMS. Customers never know it's AI — and most don't care once they're booked.",
    bullets: ["Responds in under 8 seconds", "Handles multi-message threads", "Remembers context in the conversation"],
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: DollarSign,
    title: "Instant Quoting",
    description: "Gives accurate price ranges on the spot based on your real service pricing. No more back-and-forth.",
    bullets: ["Uses your configured service rates", "Handles follow-up questions", "Moves customer toward booking"],
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: FileText,
    title: "Quotes & Invoices",
    description: "Generate professional quotes and invoices from the dashboard in seconds. Send a PDF link directly to the customer.",
    bullets: ["Branded PDF documents", "Ask the AI to generate from chat", "Downloadable link sent instantly"],
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: Handshake,
    title: "Human Handoff",
    description: "Jump into any conversation at any time. Take over from the AI, reply manually, then hand it back — all without the customer noticing a thing.",
    bullets: ["One-tap takeover from dashboard", "Full conversation history visible", "Hand back to AI when you're done"],
    span: "md:col-span-8 lg:col-span-8",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function Features() {
  return (
    <section id="features" data-testid="features-section" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="ambient-glow ambient-glow-blue w-[600px] h-[600px] top-1/4 -left-40" />
      <div className="ambient-glow ambient-glow-purple w-[500px] h-[500px] bottom-10 -right-20" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[#9775FA] mb-4 block">
            Features
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-medium gradient-text"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Everything you need to<br className="hidden sm:block" /> convert missed calls
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-4 md:gap-5"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
                data-testid={`feature-card-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                className={`${feature.span} rounded-2xl p-7 md:p-8 relative overflow-hidden group cursor-default`}
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(248,249,252,0.85) 100%)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  transition: "box-shadow 0.35s ease, border-color 0.35s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = "0 0 0 1.5px #4F6EF7, 0 0 18px rgba(79,110,247,0.25), 0 0 40px rgba(151,117,250,0.15), 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)";
                  e.currentTarget.style.borderColor = "transparent";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                }}
              >
                {/* Glossy shimmer overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(151,117,250,0.04) 100%)" }}
                />

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#4F6EF7]/10 bg-[#4F6EF7]/[0.05] mb-5 group-hover:bg-[#4F6EF7]/[0.1] transition-colors duration-300">
                    <Icon className="w-5 h-5 text-[#4F6EF7]" strokeWidth={1.5} />
                  </div>
                  <h3
                    className="text-lg font-bold text-[#0F172A] mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#475569] mb-4">
                    {feature.description}
                  </p>
                  {feature.bullets && (
                    <ul className="flex flex-col gap-1.5">
                      {feature.bullets.map(b => (
                        <li key={b} className="flex items-center gap-2 text-xs text-[#64748B]">
                          <Check className="w-3 h-3 text-[#4F6EF7] shrink-0" strokeWidth={2.5} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

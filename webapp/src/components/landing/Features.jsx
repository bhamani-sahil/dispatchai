import { motion } from "framer-motion";
import { Brain, CalendarCheck, MessageSquareText, DollarSign, FileText, Handshake } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Business Intelligence",
    description: "Knows your services, pricing, hours, and area. Answers customer questions like a trained employee.",
    span: "md:col-span-4 lg:col-span-8",
  },
  {
    icon: CalendarCheck,
    title: "Smart Booking",
    description: "Schedules appointments directly into your calendar with a full job summary attached.",
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: MessageSquareText,
    title: "Natural Conversations",
    description: "Talks like a real person over SMS. Customers never know it's AI.",
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: DollarSign,
    title: "Instant Quoting",
    description: "Gives accurate price ranges on the spot. No more back-and-forth.",
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: FileText,
    title: "Quotes & Invoices",
    description: "Generate professional quotes and invoices directly from the dashboard.",
    span: "md:col-span-4 lg:col-span-4",
  },
  {
    icon: Handshake,
    title: "Human Handoff",
    description: "Owner can jump into any conversation at any time and take over seamlessly.",
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
                data-testid={`feature-card-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                className={`${feature.span} feature-card glass-card rounded-2xl p-7 md:p-8 relative overflow-hidden group`}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, rgba(79, 110, 247, 0.04), transparent 60%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#4F6EF7]/10 bg-[#4F6EF7]/[0.05] mb-5 group-hover:bg-[#4F6EF7]/[0.08] transition-colors duration-300">
                    <Icon className="w-5 h-5 text-[#4F6EF7]" strokeWidth={1.5} />
                  </div>
                  <h3
                    className="text-lg font-medium text-[#0F172A] mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#475569]">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

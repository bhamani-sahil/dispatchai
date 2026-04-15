import { motion } from "framer-motion";
import { UserPlus, PhoneForwarded, Zap } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Set up in minutes",
    description: "Create your account, add your business info, services, and pricing. CueDesk learns your business instantly.",
  },
  {
    icon: PhoneForwarded,
    number: "02",
    title: "Forward your missed calls",
    description: "Point your phone's missed-call forwarding to your CueDesk number. One setting change, done forever.",
  },
  {
    icon: Zap,
    number: "03",
    title: "Watch it work",
    description: "Every missed caller gets an instant text. CueDesk handles the conversation, answers questions, quotes prices, and books the job — all on autopilot.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" data-testid="how-it-works-section" className="relative py-24 md:py-32 overflow-hidden">
      {/* Ambient glow */}
      <div className="ambient-glow ambient-glow-purple w-[500px] h-[500px] -top-20 -right-40" />
      <div className="ambient-glow ambient-glow-blue w-[400px] h-[400px] bottom-0 left-0" />
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[#4F6EF7] mb-4 block">
            How It Works
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-medium gradient-text"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Three steps to never miss a job again
          </h2>
        </motion.div>

        {/* Steps grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-3 gap-6 md:gap-8 relative"
        >
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-[72px] left-[20%] right-[20%] step-connector" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="relative glass-card rounded-2xl p-8 group transition-all duration-300"
              >
                {/* Step number */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-[#4F6EF7]/10 bg-[#4F6EF7]/[0.05] group-hover:bg-[#4F6EF7]/[0.08] transition-colors duration-300">
                    <Icon className="w-6 h-6 text-[#4F6EF7]" strokeWidth={1.5} />
                  </div>
                  <span
                    className="text-xs font-semibold tracking-widest text-[#94A3B8]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    STEP {step.number}
                  </span>
                </div>

                <h3
                  className="text-xl font-medium text-[#0F172A] mb-3"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#475569]">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

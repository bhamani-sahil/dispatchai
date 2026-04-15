import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "../ui/button";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For solo operators getting started",
    features: [
      "Up to 100 conversations/mo",
      "Smart booking & scheduling",
      "Basic quoting",
      "Email support",
      "1 phone number",
    ],
    highlight: false,
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "For growing businesses that need more",
    features: [
      "Unlimited conversations",
      "Smart booking & scheduling",
      "Instant quoting & invoices",
      "Priority support",
      "3 phone numbers",
      "Human handoff",
      "Custom AI training",
    ],
    highlight: true,
    cta: "Start Free Trial",
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams and multi-location businesses",
    features: [
      "Everything in Pro",
      "Unlimited phone numbers",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    highlight: false,
    cta: "Contact Sales",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function Pricing({ onSignup }) {
  return (
    <section id="pricing" data-testid="pricing-section" className="relative py-24 md:py-32 overflow-hidden">
      <div className="ambient-glow ambient-glow-purple w-[600px] h-[600px] -top-20 left-1/3" />
      <div className="ambient-glow ambient-glow-blue w-[400px] h-[400px] bottom-0 right-0" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[#4F6EF7] mb-4 block">
            Pricing
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-medium gradient-text mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-base text-[#475569] max-w-md mx-auto">
            Start free. Upgrade when you're ready. No surprises.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              data-testid={`pricing-card-${plan.name.toLowerCase()}`}
              className={`relative rounded-2xl p-7 md:p-8 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? "gradient-border animate-gradient-border bg-white shadow-lg shadow-[#4F6EF7]/[0.06]"
                  : "glass-card"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full text-white"
                    style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className="text-lg font-medium text-[#0F172A] mb-1"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {plan.name}
                </h3>
                <p className="text-sm text-[#94A3B8]">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span
                  className="text-4xl font-medium text-[#0F172A]"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {plan.price}
                </span>
                <span className="text-sm text-[#94A3B8]">{plan.period}</span>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-[#475569]">
                    <Check className="w-4 h-4 text-[#4F6EF7] mt-0.5 shrink-0" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                onClick={plan.cta !== "Contact Sales" ? onSignup : undefined}
                className={`w-full rounded-full py-5 text-sm font-medium transition-all duration-300 ${
                  plan.highlight
                    ? "text-white btn-glow"
                    : "bg-[#0F172A]/[0.04] hover:bg-[#0F172A]/[0.08] text-[#0F172A] border border-black/[0.06]"
                }`}
                style={plan.highlight ? { background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" } : {}}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

function AnimatedCounter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const stats = [
  { value: 8, suffix: "s", label: "Avg response time" },
  { value: 24, suffix: "/7", label: "Always on" },
  { value: 100, suffix: "%", label: "Calls followed up" },
  { value: 0, suffix: " voicemails", label: "Left unanswered" },
];

export default function SocialProof() {
  return (
    <section data-testid="social-proof-section" className="relative py-20 md:py-28 overflow-hidden">
      <div className="ambient-glow ambient-glow-purple w-[600px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          data-testid="stats-grid"
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-center py-6 md:py-8 rounded-2xl glass-card"
            >
              <div
                className="text-3xl sm:text-4xl font-medium stat-glow mb-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-xs sm:text-sm text-[#94A3B8]">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

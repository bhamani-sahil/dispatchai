import { motion } from "framer-motion";
import { Mic, ArrowRight } from "lucide-react";

export default function VoiceTeaser() {
  return (
    <section data-testid="voice-teaser-section" className="relative py-16 md:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}
        >
          {/* Inner glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #9775FA, transparent 70%)", filter: "blur(60px)" }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #4F6EF7, transparent 70%)", filter: "blur(60px)" }} />

          <div className="relative z-10 px-8 py-12 md:px-16 md:py-16 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Icon */}
            <div className="shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.2), rgba(151,117,250,0.15))", border: "1px solid rgba(151,117,250,0.2)" }}>
                <Mic className="w-9 h-9 text-white/90" strokeWidth={1.5} />
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-10"
                  style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }} />
              </div>
            </div>

            {/* Copy */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
                style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.15), rgba(151,117,250,0.1))", border: "1px solid rgba(151,117,250,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#9775FA] animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#9775FA]">Coming Soon</span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-medium text-white mb-3 tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                CueDesk Voice
              </h3>
              <p className="text-sm md:text-base text-white/50 max-w-md leading-relaxed">
                Not just texts — soon CueDesk will answer your phone calls with a natural AI voice. Book jobs, answer questions, and handle customers in real time.
              </p>
            </div>

            {/* CTA */}
            <div className="shrink-0">
              <button
                data-testid="voice-teaser-cta"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white/90 transition-all duration-300 hover:scale-105 group"
                style={{ background: "linear-gradient(135deg, rgba(79,110,247,0.25), rgba(151,117,250,0.2))", border: "1px solid rgba(151,117,250,0.25)" }}
              >
                Join Waitlist
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

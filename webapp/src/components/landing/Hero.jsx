import { motion } from "framer-motion";
import { Button } from "../ui/button";
import HeroCarousel from "./HeroCarousel";
import { ArrowRight, Play } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut", delay: i * 0.15 },
  }),
};

export default function Hero({ onSignup }) {
  return (
    <section
      data-testid="hero-section"
      className="relative min-h-screen flex items-center pt-24 pb-16 md:pt-32 md:pb-24"
    >
      {/* Background glow effects */}
      <div className="glow-blue -top-40 left-1/4" />
      <div className="glow-violet top-20 right-0" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4F6EF7]/15 bg-[#4F6EF7]/[0.06] mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-[#4F6EF7] animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-[#4F6EF7]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                AI-POWERED RECEPTIONIST
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] tracking-tighter font-medium leading-[1.05] mb-6"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              <span className="gradient-text">
                Your AI receptionist answers every missed call{" "}
              </span>
              <span className="gradient-text-accent">— over text.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-base lg:text-lg leading-relaxed text-[#475569] max-w-lg mx-auto lg:mx-0 mb-8"
            >
              CueDesk automatically texts customers the moment they call and you don't pick up — starting a real conversation that ends in a booking.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Button
                data-testid="hero-cta-button"
                onClick={onSignup}
                className="text-white rounded-full px-7 py-6 text-sm font-medium btn-glow transition-all duration-300 group"
                style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                data-testid="hero-secondary-cta"
                variant="ghost"
                className="rounded-full px-7 py-6 text-sm font-medium border border-black/[0.08] text-[#475569] hover:text-[#0F172A] hover:bg-black/[0.03] transition-all duration-300"
              >
                <Play className="mr-2 w-4 h-4" />
                See How It Works
              </Button>
            </motion.div>

            {/* Trust signal */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="text-xs text-[#94A3B8] mt-6"
            >
              No credit card required &middot; Setup in under 5 minutes
            </motion.p>
          </div>

          {/* Right: Rotating Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Soft glow behind phone */}
              <div className="absolute inset-0 blur-[100px] opacity-15 -z-10"
                style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }} />
              <HeroCarousel />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

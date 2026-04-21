import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export default function Footer() {
  return (
    <footer data-testid="footer-section" className="relative border-t border-black/[0.04] overflow-hidden">
      {/* Ambient glow */}
      <div className="ambient-glow ambient-glow-purple w-[500px] h-[400px] top-10 left-1/2 -translate-x-1/2" />

      {/* CTA Banner */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-medium gradient-text mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Stop losing customers<br className="hidden sm:block" /> to voicemail
          </h2>
          <p className="text-base text-[#475569] max-w-md mx-auto mb-8">
            Every missed call is revenue walking away. CueDesk brings it back — automatically.
          </p>
          <Button
            data-testid="footer-cta-button"
            className="text-white rounded-full px-8 py-6 text-sm font-medium btn-glow transition-all duration-300 group"
            style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}
          >
            Get Started Free
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </motion.div>
      </div>

      {/* Footer links */}
      <div className="border-t border-black/[0.04] bg-[#F8F9FC]/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src="/cuedesk-icon.svg" alt="CueDesk" className="w-7 h-7" />
              <span className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>CueDesk</span>
            </div>

            <p className="text-xs text-[#94A3B8] text-center">
              Questions?{" "}
              <a href="mailto:info@cuedesk.ca" className="text-[#4F6EF7] hover:underline">
                info@cuedesk.ca
              </a>
            </p>

            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5">
              &copy; {new Date().getFullYear()} CueDesk. All rights reserved.
              <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                🍁 Made in Canada
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

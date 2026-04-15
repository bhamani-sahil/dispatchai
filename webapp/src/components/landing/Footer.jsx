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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-medium text-[#0F172A] mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Product
              </h4>
              <ul className="flex flex-col gap-2.5">
                {["Features", "Pricing", "Integrations", "Changelog"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[#94A3B8] hover:text-[#475569] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#0F172A] mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Company
              </h4>
              <ul className="flex flex-col gap-2.5">
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[#94A3B8] hover:text-[#475569] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#0F172A] mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Resources
              </h4>
              <ul className="flex flex-col gap-2.5">
                {["Documentation", "Help Center", "API Reference", "Status"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[#94A3B8] hover:text-[#475569] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#0F172A] mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Legal
              </h4>
              <ul className="flex flex-col gap-2.5">
                {["Privacy", "Terms", "Security", "Cookies"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[#94A3B8] hover:text-[#475569] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-black/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 relative flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <defs>
                    <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#4F6EF7"/>
                      <stop offset="100%" stopColor="#9775FA"/>
                    </linearGradient>
                  </defs>
                  <path d="M24 8.5A11 11 0 1 0 24 23.5" stroke="url(#footerLogoGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
                  <circle cx="25" cy="8.5" r="3" fill="#9775FA"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>CueDesk</span>
            </div>

            <p className="text-xs text-[#94A3B8] text-center">
              Built for trades, home services, and local businesses.
            </p>

            <p className="text-xs text-[#94A3B8]">
              &copy; {new Date().getFullYear()} CueDesk. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

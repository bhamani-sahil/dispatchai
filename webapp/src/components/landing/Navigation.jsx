import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const CueDeskLogo = () => (
  <div className="flex items-center gap-2 group">
    <img src="/cuedesk-icon.svg" alt="CueDesk" className="w-9 h-9" />
    <span className="text-[1.25rem] font-semibold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <span style={{ background: "linear-gradient(135deg, #4F6EF7 0%, #9775FA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Cue</span><span className="text-[#0F172A]">Desk</span>
    </span>
  </div>
);

const DASHBOARD_URL = process.env.REACT_APP_DASHBOARD_URL;

export default function Navigation({ onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      data-testid="main-navigation"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-white/75 border-b border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-16 md:h-[72px]">
        <a href="#" data-testid="logo-link" aria-label="CueDesk Home">
          <CueDeskLogo />
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm text-[#475569] hover:text-[#0F172A] transition-colors duration-200 font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            data-testid="nav-login-button"
            onClick={() => window.location.href = "/login"}
            className="text-sm text-[#475569] hover:text-[#0F172A] hover:bg-black/[0.03] font-medium"
          >
            Log in
          </Button>
          <Button
            data-testid="nav-signup-button"
            onClick={onSignup}
            className="text-sm text-white rounded-full px-5 btn-glow transition-all duration-200 font-medium"
            style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}
          >
            Sign up
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          data-testid="mobile-menu-toggle"
          className="md:hidden text-[#475569] hover:text-[#0F172A]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden backdrop-blur-xl bg-white/95 border-b border-black/[0.04] overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[#475569] hover:text-[#0F172A] transition-colors py-1 font-medium"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => window.location.href = "/login"} className="text-sm text-[#475569] hover:text-[#0F172A] font-medium">
                  Log in
                </Button>
                <Button onClick={onSignup} className="text-sm text-white rounded-full px-5 font-medium"
                  style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
                  Sign up
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

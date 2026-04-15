import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

const API_URL = process.env.REACT_APP_API_URL;
const DASHBOARD_URL = process.env.REACT_APP_DASHBOARD_URL;

export default function SignupModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Signup failed. Please try again.");
        return;
      }
      // Store token and redirect to onboarding
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/onboarding";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#475569] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}>
                  <span className="text-white text-sm font-bold">CD</span>
                </div>
                <h2 className="text-2xl font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Start your free trial
                </h2>
                <p className="text-sm text-[#94A3B8] mt-1">No credit card required. Setup in under 5 minutes.</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="John Smith"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#475569] mb-1.5 block">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white rounded-xl py-6 text-sm font-medium transition-all duration-300 group"
                  style={{ background: "linear-gradient(135deg, #4F6EF7, #7C5CFC)" }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 w-4 h-4 inline group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-[#94A3B8] text-center mt-4">
                Already have an account?{" "}
                <a
                  href={DASHBOARD_URL}
                  className="text-[#4F6EF7] hover:underline font-medium"
                >
                  Sign in
                </a>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

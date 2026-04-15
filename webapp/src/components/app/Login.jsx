import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;
const PURPLE = "linear-gradient(135deg, #4F6EF7, #7C5CFC)";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Invalid email or password.");
        return;
      }
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #F8F9FE 0%, #FFFFFF 100%)" }}>
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20 blur-[120px] pointer-events-none"
        style={{ background: "linear-gradient(135deg, #4F6EF7, #9775FA)" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: PURPLE }}>
            <span className="text-white text-sm font-bold">CD</span>
          </div>
          <span className="text-xl font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            CueDesk
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-[#0F172A]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">Sign in to your CueDesk account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">EMAIL</label>
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
              <label className="text-xs font-semibold text-[#475569] tracking-wide mb-1.5 block">PASSWORD</label>
              <input
                name="password"
                type="password"
                required
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-black/[0.08] text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 transition"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60"
              style={{ background: PURPLE }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <> Sign In <ArrowRight className="w-4 h-4" /> </>
              }
            </button>
          </form>

          <p className="text-xs text-[#94A3B8] text-center mt-5">
            Don't have an account?{" "}
            <a href="/" className="text-[#4F6EF7] hover:underline font-medium">
              Get started free
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

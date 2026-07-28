import React, { useState } from "react";
import {
  Mail,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Fingerprint,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const navigate = useNavigate();

  // ✅ Use environment variable
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isDisabled = !email || submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      // ✅ Use API_URL instead of localhost
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Recovery request failed");
      }

      navigate("/verify-reset", {
        state: { email },
      });
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex items-center justify-center p-6 selection:bg-cyan-500/30">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in duration-500">

        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative group">
            <div className="absolute -inset-6 border border-cyan-500/10 rounded-full animate-[spin_15s_linear_infinite]" />
            <div className="absolute -inset-4 border border-cyan-500/30 rounded-full animate-[spin_8s_linear_infinite_reverse]" />

            <div className="relative w-24 h-24 rounded-[2rem] bg-black border border-cyan-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)] group-hover:shadow-[0_0_60px_rgba(6,182,212,0.4)] transition-all duration-700">
              <Fingerprint
                className="text-cyan-500"
                size={48}
                strokeWidth={1.2}
              />

              <div className="absolute inset-x-4 top-1/2 h-[1px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[bounce_2s_infinite] opacity-40" />
            </div>
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              CODE<span className="text-cyan-500">VERSE</span>
            </h1>

            <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.5em] mt-2">
              Security Infrastructure
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-[40px] rounded-[3rem] p-10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden">

          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="space-y-3 mb-10 text-center relative z-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              Reset Password
            </h2>

            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.15em] leading-relaxed max-w-[300px] mx-auto">
              Authorize account recovery by confirming your registered email
              address.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-8 p-4 bg-red-500/10 border-l-4 border-red-500 rounded text-red-500 text-[11px] font-black uppercase tracking-tight">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.25em] ml-2">
                Access Identity
              </label>

              <div className="relative group">
                <Mail
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-all duration-300"
                  size={20}
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your system email"
                  required
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-14 py-5 text-sm outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all placeholder:text-gray-800"
                />
              </div>
            </div>

            <div className="pt-4 space-y-5">
              <button
                type="submit"
                disabled={isDisabled}
                className="w-full group bg-white text-black hover:bg-cyan-500 hover:text-white disabled:bg-white/5 disabled:text-gray-700 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Syncing...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ChevronRight
                      size={18}
                      className="group-hover:translate-x-1.5 transition-transform"
                    />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-cyan-400 transition-all duration-300"
              >
                <ArrowLeft size={16} />
                Return to Sign In
              </button>
            </div>
          </form>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4 opacity-40">
          <div className="h-[1px] w-12 bg-gray-800" />
          <p className="text-[8px] font-black uppercase text-gray-600 tracking-[0.5em]">
            End-to-End Encrypted
          </p>
          <div className="h-[1px] w-12 bg-gray-800" />
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
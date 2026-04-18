import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Loader2, ChevronRight, ArrowLeft, Cpu } from "lucide-react";

const MFA = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id } = location.state || {};

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputsRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!user_id) navigate("/login");
  }, [user_id, navigate]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/, "");
    const newCode = [...code];
    newCode[idx] = val;
    setCode(newCode);

    // Auto-focus next input
    if (val && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    // Backspace to previous input
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const token = code.join("");
    if (token.length < 6) {
      setErrorMessage("Please enter the full 6-digit code");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");

      localStorage.setItem("token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      
      navigate(payload.role === "admin" ? "/adminDashboard" : "/developerDashboard");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex items-center justify-center p-6 selection:bg-cyan-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* ENHANCED SECURITY SYMBOL */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative group">
            <div className="absolute -inset-6 border border-cyan-500/10 rounded-full animate-[spin_15s_linear_infinite]" />
            <div className="absolute -inset-4 border border-cyan-500/30 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
            
            <div className="relative w-24 h-24 rounded-[2rem] bg-black border border-cyan-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)]">
              <ShieldCheck className="text-cyan-500" size={48} strokeWidth={1.2} />
              
              {/* Internal scanning line */}
              <div className="absolute inset-x-4 top-1/2 h-[1px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[bounce_2s_infinite] opacity-40" />
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              CODE<span className="text-cyan-500">VERSE</span>
            </h1>
            <p className="text-gray-600 text-[9px] font-black uppercase tracking-[0.5em] mt-2">Identity Verification</p>
          </div>
        </div>

        {/* TACTICAL MFA CARD */}
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-[40px] rounded-[3rem] p-10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden">
          
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="space-y-3 mb-10 text-center relative z-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              Security Challenge
            </h2>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.15em] leading-relaxed">
              Enter the 6-digit authentication code from your registered device.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-8 p-4 bg-red-500/10 border-l-4 border-red-500 rounded text-red-500 text-[11px] font-black uppercase tracking-tight animate-in slide-in-from-top">
              {errorMessage}
            </div>
          )}

          <div className="space-y-8 relative z-10">
            {/* 6-Digit Input Grid */}
            <div className="flex justify-between gap-2">
              {code.map((num, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputsRef.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  value={num}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onChange={(e) => handleChange(e, idx)}
                  className="w-full h-16 text-center text-2xl font-black bg-black/60 border border-white/10 rounded-2xl text-cyan-400 outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
                />
              ))}
            </div>

            <div className="pt-4 space-y-5">
              <button
                onClick={handleVerify}
                disabled={submitting || code.join("").length < 6}
                className="w-full group bg-white text-black hover:bg-cyan-500 hover:text-white disabled:bg-white/5 disabled:text-gray-700 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Validating...
                  </>
                ) : (
                  <>
                    Verify & Authorize
                    <ChevronRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-cyan-400 transition-all duration-300"
              >
                <ArrowLeft size={16} />
                Aborted Session
              </button>
            </div>
          </div>
        </div>

        {/* Global Footer */}
        <div className="mt-10 flex items-center justify-center gap-4 opacity-40">
           <Cpu className="text-gray-600" size={14} />
           <p className="text-[8px] font-black uppercase text-gray-600 tracking-[0.5em]">
             Authorized Access Protocol
           </p>
        </div>
      </div>
    </div>
  );
};

export default MFA;
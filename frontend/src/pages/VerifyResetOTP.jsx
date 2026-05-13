import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, ArrowLeft, Loader2, CheckCircle2, Circle } from "lucide-react";

const VerifyResetOTP = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const inputRefs = useRef([]);

  // Validation Logic
  const validation = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const isFormValid = Object.values(validation).every(Boolean) && otp.join("").length === 6;

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state?.email, otp: otp.join(""), password }),
      });

      const data = await res.json();
      if (res.ok) {
        navigate("/login");
      } else {
        setError(data.detail || "Verification failed. Check your code.");
      }
    } catch (err) {
      setError("System connection lost. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans overflow-hidden flex items-center justify-center p-6">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in duration-500">
        
        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-[40px] rounded-[3rem] p-10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden">
          {/* Cyber-pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <ShieldCheck className="text-cyan-500" size={32} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Verify Identity</h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.15em] mt-2">
              Verification token sent to <span className="text-cyan-500/80">{state?.email || "your email"}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 rounded text-red-500 text-[10px] font-bold uppercase tracking-tight animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-8 relative z-10">
            {/* OTP Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-2">Secure Token</label>
              <div className="flex justify-between gap-2">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-14 bg-black/60 border border-white/10 rounded-xl text-center text-xl font-bold text-cyan-500 outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-2">New Access Cipher</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-all" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-14 py-4 text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-800"
                  />
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="grid grid-cols-2 gap-2 px-2">
                <Requirement label="8+ Characters" met={validation.length} />
                <Requirement label="Uppercase" met={validation.upper} />
                <Requirement label="Number" met={validation.number} />
                <Requirement label="Symbol" met={validation.special} />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full bg-white text-black hover:bg-cyan-500 hover:text-white disabled:bg-white/5 disabled:text-gray-700 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl flex items-center justify-center gap-3"
              >
                {submitting ? <Loader2 className="animate-spin" /> : "Authorize Reset"}
              </button>
              
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-cyan-400 transition-all"
              >
                <ArrowLeft size={14} /> Cancel Override
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Requirements
const Requirement = ({ label, met }) => (
  <div className={`flex items-center gap-2 ${met ? "text-cyan-500" : "text-gray-700"} transition-colors duration-300`}>
    {met ? <CheckCircle2 size={12} /> : <Circle size={12} />}s
    <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
  </div>
);

export default VerifyResetOTP;
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

  // SAFE JWT DECODER
  const safeDecode = (token) => {
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) return null;
      
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Decode Error:", e);
      return null;
    }
  };

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/, "");
    const newCode = [...code];
    newCode[idx] = val;
    setCode(newCode);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const tokenStr = code.join("");
    if (tokenStr.length < 6) {
      setErrorMessage("Please enter the full 6-digit code");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, token: tokenStr }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        
        const payload = safeDecode(data.access_token);
        const role = payload?.role || data.role;

        if (role === "admin") {
          navigate("/adminDashboard");
        } else {
          navigate("/developerDashboard");
        }
      } else {
        throw new Error("Final Auth Token missing from server response");
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#020405] text-gray-200 font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-12">
          <div className="relative w-24 h-24 rounded-[2rem] bg-black border border-cyan-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <ShieldCheck className="text-cyan-500" size={48} strokeWidth={1.2} />
          </div>
          <div className="mt-8 text-center">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              CODE<span className="text-cyan-500">VERSE</span>
            </h1>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-[40px] rounded-[3rem] p-10 shadow-2xl">
          <div className="space-y-3 mb-10 text-center">
            <h2 className="text-2xl font-black text-white uppercase">Security Challenge</h2>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
              Enter the 6-digit code from your app.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-8 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-500 text-[11px] font-black uppercase">
              {errorMessage}
            </div>
          )}

          <div className="space-y-8">
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
                  className="w-full h-16 text-center text-2xl font-black bg-black/60 border border-white/10 rounded-2xl text-cyan-400 outline-none focus:border-cyan-500"
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={submitting || code.join("").length < 6}
              className="w-full bg-white text-black hover:bg-cyan-500 hover:text-white disabled:opacity-20 py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
            >
              {submitting ? <Loader2 className="animate-spin" /> : "Verify & Authorize"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFA;
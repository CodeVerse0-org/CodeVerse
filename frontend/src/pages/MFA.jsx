// MFA.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import { AuthNavbar } from "../components/AuthNavbar";

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
          .join(""),
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
    <div className="min-h-screen w-full bg-black text-gray-200 font-sans flex flex-col selection:bg-cyan-500/35 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Shared Navbar with Bottom Line Divider */}
      <div className="w-full border-b border-white/10 relative z-20">
        <AuthNavbar />
      </div>

      {/* Top Left Back Button Section right under the navbar header */}
      <div className="w-full px-6 lg:px-12 pt-6 relative z-20 flex justify-start">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-white text-black font-black text-[10px] font-mono uppercase tracking-widest rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Main Container Centered */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 -mt-10">
        <div className="w-full max-w-[480px]">
          {/* Tactical Form Card */}
          <div className="bg-[#05070a] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

            <div className="space-y-2 mb-8 text-center">
              <div className="flex items-center justify-center">
                <h2 className="text-xl font-black text-white uppercase tracking-wider italic">
                  MFA Authentication
                </h2>
              </div>
              <p className="text-gray-400 text-xs font-mono leading-relaxed">
                Enter the 6-digit verification code generated by your
                authentication application.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-3 animate-in slide-in-from-top-2 text-center">
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-6">
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
                    className="w-full h-14 text-center text-xl font-black bg-black/60 border border-white/10 rounded-xl text-cyan-400 outline-none focus:border-cyan-500/50 focus:bg-black/90 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all font-mono"
                  />
                ))}
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={submitting || code.join("").length < 6}
                  className="w-full group bg-cyan-500 hover:bg-white disabled:bg-white/5 disabled:text-gray-600 disabled:cursor-not-allowed text-black py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-3 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Authorize
                      <ChevronRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFA;

// VerifyEmail.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { AuthNavbar } from "../components/AuthNavbar";

const VerifyEmail = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const verify = async () => {
    setError("");
    setSuccessMessage("");
    const code = otp.join("");

    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state?.email,
          otp: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Verification failed");
        setLoading(false);
        return;
      }

      // 1. SAVE TOKEN
      localStorage.setItem("token", data.access_token);

      // 2. CACHE USER DATA (The fix for the sidebar flicker)
      if (data.user) {
        localStorage.setItem("user_fname", data.user.first_name);
        localStorage.setItem("user_lname", data.user.last_name);
      }

      // 3. ORIGINAL NAVIGATION LOGIC (Unchanged)
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const role = payload.role;

      if (role === "developer") {
        navigate("/developerDashboard");
        return;
      }

      if (role === "admin") {
        const statusRes = await fetch(
          `${API_URL}/api/github/status?user_id=${payload.user_id}`,
          {
            headers: { Authorization: `Bearer ${data.access_token}` },
          },
        );
        const statusData = await statusRes.json();

        if (statusData.connected) {
          navigate("/adminDashboard");
        } else {
          navigate("/github-connect", { state: { user_id: payload.user_id } });
        }
      }
    } catch (err) {
      setError(err.message || "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!state?.email) {
      setError("Email address is missing. Please register again.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setResending(true);

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to resend verification code.");
      }

      setSuccessMessage("New security code sent successfully!");
    } catch (err) {
      setError(err.message || "Network error. Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-gray-200 font-sans flex flex-col selection:bg-cyan-500/35 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Shared Navbar with Bottom Line Divider (Decreased width container) */}
      <div className="w-full border-b border-white/10 relative z-20 flex justify-center">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <AuthNavbar />
        </div>
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
                  Security Check
                </h2>
              </div>
              <p className="text-gray-400 text-xs font-mono leading-relaxed">
                Enter the 6-digit code sent to your email <br />
                <span className="text-cyan-400 font-bold">{state?.email}</span>
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-3 animate-in slide-in-from-top-2 text-center">
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-3 animate-in slide-in-from-top-2 text-center">
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, index)}
                    disabled={loading}
                    className="w-full h-14 text-center text-xl font-black bg-black/60 border border-white/10 rounded-xl text-cyan-400 outline-none focus:border-cyan-500/50 focus:bg-black/90 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all font-mono disabled:opacity-50"
                  />
                ))}
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={verify}
                  disabled={loading}
                  className="w-full group bg-cyan-500 hover:bg-white disabled:bg-white/5 disabled:text-gray-600 disabled:cursor-not-allowed text-black py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-3 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Continue
                      <ChevronRight
                        size={16}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="w-full text-center text-[10px] text-gray-500 hover:text-cyan-400 mt-6 font-mono font-bold uppercase tracking-widest cursor-pointer transition-colors bg-transparent border-none outline-none disabled:opacity-50"
              >
                {resending ? "Sending Code..." : "Resend Security Code"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

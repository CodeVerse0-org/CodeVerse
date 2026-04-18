import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle, Cpu } from "lucide-react";

const VerifyEmail = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      // We save the user details from the response immediately
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
        const statusRes = await fetch(`${API_URL}/api/github/status?user_id=${payload.user_id}`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020405] text-gray-300 font-sans">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[400px] z-10 px-4">
        <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
              Code<span className="text-cyan-500">Verse</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-1">
              Visualize Your Codebase
            </p>
          </div>

          <div className="h-[1px] bg-white/5 w-full mb-8" />

          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
              Security Check
            </h2>
            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              Enter the 6-digit code sent to your email <br/>
              <span className="text-cyan-500/80">{state?.email}</span>
            </p>
          </div>

          <div className="flex justify-between gap-2 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                className="w-12 h-14 text-center text-xl font-black rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-cyan-500 transition-all"
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-6 text-rose-500 justify-center">
              <AlertCircle size={14} />
              <p className="text-[11px] font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <button
            onClick={verify}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-cyan-950/20 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>

          <p className="text-center text-[10px] text-gray-600 mt-8 font-black uppercase tracking-widest cursor-pointer hover:text-cyan-500 transition-colors">
            Resend Security Code
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
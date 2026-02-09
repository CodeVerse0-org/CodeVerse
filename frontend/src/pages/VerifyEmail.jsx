import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");

  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);

    // auto focus next
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
        return;
      }

      navigate("/mfa-setup", {
        state: { user_id: data.user_id },
      });
    } catch {
      setError("Server error. Try again.");
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-cyan-900 px-4">
      <div className="w-[380px] bg-black/40 backdrop-blur-lg border border-white/10 rounded-xl p-8 shadow-xl">

        {/* Header */}
        <h1 className="text-2xl font-semibold text-center">CodeVerse</h1>
        <p className="text-xs text-gray-400 text-center mb-6">
          Visualize Your Codebase
        </p>

        <hr className="border-white/10 mb-6" />

        <h2 className="text-lg text-center font-medium mb-1">
          Enter Security Code
        </h2>
        <p className="text-xs text-gray-400 text-center mb-6">
          Open your authenticator app to get this code.
        </p>

        {/* OTP Boxes */}
        <div className="flex justify-between mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              className="w-12 h-12 text-center text-lg rounded-md bg-gray-200 text-black focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-xs text-center mb-3">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-cyan-400 mb-4 cursor-pointer">
          Need Help with MFA?
        </p>

        {/* Button */}
        <button
          onClick={verify}
          className="w-full bg-white text-black font-medium py-2 rounded-md hover:bg-gray-200 transition"
        >
          Verify and Login
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;

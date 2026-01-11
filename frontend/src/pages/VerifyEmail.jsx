import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const verify = async () => {
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          otp: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Verification failed");
        return;
      }

      // ✅ SUCCESS → MFA SCREEN
      navigate("/mfa-setup", {
        state: { user_id: data.user_id },
      });

    } catch (err) {
      setError("Server error. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-6 rounded w-80">
        <h2 className="text-xl text-center mb-3">Verify Email</h2>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          className="w-full p-2 bg-gray-800 rounded mb-2"
          maxLength={6}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={verify}
          className="w-full bg-cyan-500 text-black py-2 rounded"
        >
          Verify
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;

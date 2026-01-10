import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleVerify = async () => {
    if (code.join("").length !== 6) {
      setErrorMessage("Please enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, token: code.join("") }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");

      localStorage.setItem("token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const userRole = payload.role;

      if (userRole === "admin") navigate("/adminDashboard");
      else navigate("/developerDashboard");

    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-cyan-900 px-4">
      <div className="bg-gradient-to-tr from-cyan-800/50 to-black/50 rounded-lg shadow-xl w-[400px] px-6 py-8 text-white text-center">
        <h1 className="text-3xl font-bold mb-1">CodeVerse</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your MFA code</p>

        {errorMessage && <p className="text-red-500 text-xs mb-2">{errorMessage}</p>}

        <div className="flex justify-between mb-4">
          {code.map((num, idx) => (
            <input
              key={idx}
              type="text"
              maxLength={1}
              value={num}
              onChange={(e) => handleChange(e, idx)}
              ref={(el) => (inputsRef.current[idx] = el)}
              className="w-12 h-12 mx-1 text-center text-black bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={submitting}
          className="w-full bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-100"
        >
          {submitting ? "Verifying..." : "Verify & Login"}
        </button>
      </div>
    </div>
  );
};

export default MFA;

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const MFA = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user_id } = location.state || {}; // Get user_id passed from Login

  const [code, setCode] = useState(["", "", "", "", "", ""]);
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
    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, token: code.join("") }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");

      // ✅ Store the final access token
      localStorage.setItem("token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      
      // ✅ Dynamic Redirection
      navigate(payload.role === "admin" ? "/adminDashboard" : "/developerDashboard");
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-gray-900 p-8 rounded-xl border border-cyan-500 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Security Challenge</h2>
        <p className="text-gray-400 mb-6">Enter the code from your app</p>
        
        <div className="flex justify-center gap-2 mb-6">
          {code.map((num, idx) => (
            <input
              key={idx}
              ref={(el) => (inputsRef.current[idx] = el)}
              type="text"
              maxLength={1}
              value={num}
              onChange={(e) => handleChange(e, idx)}
              className="w-12 h-14 text-center text-2xl bg-black border border-cyan-500 rounded text-cyan-400"
            />
          ))}
        </div>
        
        {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}
        
        <button onClick={handleVerify} className="w-full bg-cyan-600 py-3 rounded-lg font-bold">
          Verify & Log In
        </button>
      </div>
    </div>
  );
};

export default MFA;
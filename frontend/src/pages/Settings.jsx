import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import Sidebar from "../components/Sidebar";

const Settings = () => {
  const [user, setUser] = useState({ id: null, mfa_enabled: false });
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // 1. Fetch MFA status from DB on mount
  useEffect(() => {
    const fetchMFAStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub;

        const res = await fetch(`${API_URL}/mfa/status/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        setUser({ id: userId, mfa_enabled: data.mfa_enabled });
      } catch (err) {
        console.error("Failed to fetch MFA status", err);
      }
    };

    fetchMFAStatus();
  }, []);

  const handleToggle = async () => {
    if (user.mfa_enabled) {
      // Logic to disable
      const res = await fetch(`${API_URL}/mfa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) {
        setUser({ ...user, mfa_enabled: false });
        setMsg("MFA Disabled");
      }
    } else {
      // Show QR Setup
      enableMFA();
    }
  };

  const enableMFA = async () => {
    const res = await fetch(`${API_URL}/mfa/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });
    const data = await res.json();
    const qrImg = await QRCode.toDataURL(data.otpauth_url);
    setQr(qrImg);
  };

  const confirmSetup = async () => {
    const res = await fetch(`${API_URL}/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, token: code }),
    });
    if (res.ok) {
      setUser({ ...user, mfa_enabled: true });
      setQr("");
      setMsg("✅ MFA Enabled and Saved");
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar admin={user} isConnected={true} />
      <div className="flex-1 p-10">
        <div className="max-w-md bg-gray-900 p-6 rounded-xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <span className="font-semibold text-lg">MFA Protection</span>
            {/* Toggle UI */}
            <button
              onClick={handleToggle}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                user.mfa_enabled ? "bg-cyan-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  user.mfa_enabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {qr && (
            <div className="text-center">
              <img src={qr} alt="QR" className="mx-auto mb-4 border-2 border-white" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 rounded bg-black border border-cyan-500 mb-2 text-center"
                placeholder="000000"
              />
              <button onClick={confirmSetup} className="w-full bg-cyan-600 p-2 rounded font-bold">
                Verify & Save
              </button>
            </div>
          )}
          {msg && <p className="text-center text-cyan-400 mt-2">{msg}</p>}
        </div>
      </div>
    </div>
  );
};

export default Settings;
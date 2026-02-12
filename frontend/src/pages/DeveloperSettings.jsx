import React, { useState, useEffect } from "react";
import { LayoutDashboard, Folder, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";

const DeveloperSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ id: null, first_name: "", last_name: "", email: "", mfa_enabled: false });
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // 1. Get User Info
        const userRes = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        
        // 2. Get MFA Status
        const mfaRes = await fetch(`${API_URL}/mfa/status/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const mfaData = await mfaRes.json();

        setUser({ ...userData, mfa_enabled: mfaData.mfa_enabled });
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [API_URL, navigate]);

  const handleToggle = async () => {
    if (user.mfa_enabled) {
      if (!window.confirm("Disable MFA? Your account will be less secure.")) return;
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
    setMsg("Scan the QR code with your Authenticator App");
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
      setCode("");
      setMsg("✅ MFA Enabled successfully");
    } else {
      setMsg("❌ Invalid code. Try again.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black to-cyan-900 text-white">
      {/* SIDEBAR - Exactly as in DeveloperDashboard */}
      <aside className="w-72 bg-black/40 border-r border-white/10 p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-xl">
              {user.first_name?.[0]}
            </div>
            <div>
              <p className="font-semibold">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-400 truncate w-40">{user.email}</p>
            </div>
          </div>
          <nav className="space-y-2">
            <div 
              onClick={() => navigate("/developerDashboard")}
              className="flex items-center gap-3 p-3 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
            >
              <LayoutDashboard size={20}/> Dashboard
            </div>
            <div className="flex items-center gap-3 p-3 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
              <Folder size={20}/> Projects
            </div>
            <div 
              className="flex items-center gap-3 p-3 bg-cyan-600/20 rounded-lg text-cyan-400 cursor-pointer"
            >
              <SettingsIcon size={20}/> Settings
            </div>
          </nav>
        </div>
        <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 p-3 transition-colors">
          <LogOut size={20}/> Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
              <p className="text-gray-400 text-sm mt-1">Keep your account secure by requiring a 6-digit code.</p>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggle}
              className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${
                user.mfa_enabled ? "bg-cyan-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                  user.mfa_enabled ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <hr className="border-white/10 my-6" />

          {qr && (
            <div className="flex flex-col items-center animate-in fade-in duration-500">
              <div className="bg-white p-2 rounded-lg mb-6">
                <img src={qr} alt="QR Code" className="w-44 h-44" />
              </div>
              <div className="w-full max-w-xs space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/50 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="000000"
                />
                <button 
                  onClick={confirmSetup} 
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold transition-all"
                >
                  Confirm & Activate
                </button>
              </div>
            </div>
          )}

          {msg && (
            <p className={`text-center mt-4 font-medium ${msg.includes("✅") ? "text-cyan-400" : "text-gray-300"}`}>
              {msg}
            </p>
          )}

          {!qr && user.mfa_enabled && (
            <div className="flex items-center gap-2 text-cyan-400 bg-cyan-400/10 p-4 rounded-lg">
              <span className="text-sm font-semibold">✓ MFA is currently active on your account.</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DeveloperSettings;
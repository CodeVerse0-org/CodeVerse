import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Loader2,
  Smartphone,
  User,
  Lock,
  Save,
  RefreshCcw,
  Settings as SettingsIcon,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import AdminNavbar from "../components/AdminNavbar";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [user, setUser] = useState({ id: null, mfa_enabled: false });
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const [isConnected, setIsConnected] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    currentPassword: "",
    newPassword: "",
  });

  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/\/$/, "");

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = parseInt(payload.sub, 10);

      const [adminRes, statusRes, mfaRes] = await Promise.all([
        fetch(`${API_URL}/auth/me`, { headers }),
        fetch(`${API_URL}/api/github/status`, { headers }),
        fetch(`${API_URL}/mfa/status/${userId}`, { headers }),
      ]);

      if (adminRes.ok) {
        const data = await adminRes.json();
        const fullName =
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
          data.email;
        setAdmin({ name: fullName, email: data.email });
        setFormData((f) => ({
          ...f,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
        }));
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsConnected(Boolean(statusData.connected));
      }

      if (mfaRes.ok) {
        const mfaData = await mfaRes.json();
        setUser({ id: userId, mfa_enabled: Boolean(mfaData.mfa_enabled) });
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg("Processing Request...");

    const token = localStorage.getItem("token");
    const endpoint =
      activeTab === "general"
        ? "/auth/update-profile"
        : "/auth/change-password";

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMsg("✅ System Records Updated");
        if (activeTab === "general") {
          setAdmin((prev) => ({
            ...prev,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
          }));
        }
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
        }));
      } else {
        const errData = await res.json().catch(() => ({}));
        setMsg(`❌ Update Failed: ${errData.detail || "Verify Credentials"}`);
      }
    } catch (err) {
      setMsg("❌ Network/Connection Error");
    } finally {
      setActionLoading(false);
    }
  };

  const enableMFA = async () => {
    setMsg("Requesting Secret...");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/mfa/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await res.json();
      if (res.ok) {
        const qrImg = await QRCode.toDataURL(data.otpauth_url);
        setQr(qrImg);
        setMsg("");
      } else {
        setMsg(`❌ Setup Failed: ${data.detail || "Could not initialize MFA"}`);
      }
    } catch (err) {
      console.error("MFA Enable Error:", err);
      setMsg("❌ Network/Connection Error");
    }
  };

  const handleMfaToggle = async () => {
    const token = localStorage.getItem("token");
    if (user.mfa_enabled) {
      if (!window.confirm("Disabling MFA reduces security. Proceed?")) return;
      setMsg("Deactivating MFA...");
      try {
        const res = await fetch(`${API_URL}/mfa/disable`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: user.id }),
        });

        if (res.ok) {
          setUser((prev) => ({ ...prev, mfa_enabled: false }));
          setQr("");
          setMsg("✅ MFA Protocol Deactivated");
        } else {
          const data = await res.json().catch(() => ({}));
          setMsg(`❌ Deactivation Failed: ${data.detail || "Server error"}`);
        }
      } catch (err) {
        console.error("MFA Disable Error:", err);
        setMsg("❌ Network/Connection Error");
      }
    } else {
      enableMFA();
    }
  };

  const confirmSetup = async () => {
    const token = localStorage.getItem("token");
    setMsg("Verifying Code...");
    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id, token: code }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
        }
        setUser((prev) => ({ ...prev, mfa_enabled: true }));
        setQr("");
        setCode("");
        setMsg("✅ Admin Protection Enabled");
      } else {
        setMsg(`❌ Verification Failed: ${data.detail || "Invalid Code"}`);
      }
    } catch (err) {
      console.error("MFA Verify Error:", err);
      setMsg("❌ Network/Connection Error");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <AdminNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          admin={admin}
          isConnected={isConnected}
          isOpen={isSidebarOpen}
          loading={loading}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#010203]">
          <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl w-full mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                      Security Control
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    ADMIN SETTINGS{" "}
                    <SettingsIcon className="text-cyan-500" size={24} />
                  </h1>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Active Admin:{" "}
                  <span className="text-cyan-400 font-bold">
                    {admin.name || "Authenticated"}
                  </span>
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-3">
                  <Loader2 className="animate-spin text-cyan-500" size={36} />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-500/80 font-mono font-bold">
                    Synchronizing Profiles...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Navigation Sidebar Tabs */}
                  <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setActiveTab("general");
                        setMsg("");
                      }}
                      className={`flex items-center gap-3 px-5 py-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === "general"
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                          : "bg-[#05070a] border border-white/5 text-gray-400 hover:bg-white/[0.02] hover:text-white"
                      }`}
                    >
                      <User size={16} /> Admin Profile
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("security_pass");
                        setMsg("");
                      }}
                      className={`flex items-center gap-3 px-5 py-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === "security_pass"
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                          : "bg-[#05070a] border border-white/5 text-gray-400 hover:bg-white/[0.02] hover:text-white"
                      }`}
                    >
                      <Lock size={16} /> Credentials
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("mfa");
                        setMsg("");
                      }}
                      className={`flex items-center gap-3 px-5 py-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === "mfa"
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
                          : "bg-[#05070a] border border-white/5 text-gray-400 hover:bg-white/[0.02] hover:text-white"
                      }`}
                    >
                      <Fingerprint size={16} /> MFA Security
                    </button>
                  </div>

                  {/* Active Tab Views */}
                  <div className="flex-1">
                    {(activeTab === "general" ||
                      activeTab === "security_pass") && (
                      <div className="bg-[#05070a] border border-white/5 rounded-2xl p-8 shadow-xl animate-in fade-in duration-300">
                        <form onSubmit={handleUpdate} className="space-y-6">
                          {activeTab === "general" ? (
                            <div className="grid grid-cols-1 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                                  First Name
                                </label>
                                <input
                                  type="text"
                                  value={formData.firstName}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      firstName: e.target.value,
                                    })
                                  }
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                                  Last Name
                                </label>
                                <input
                                  type="text"
                                  value={formData.lastName}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      lastName: e.target.value,
                                    })
                                  }
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                                  Current Password
                                </label>
                                <input
                                  type="password"
                                  value={formData.currentPassword}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      currentPassword: e.target.value,
                                    })
                                  }
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-rose-500/50 outline-none transition-all font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                                  New Password
                                </label>
                                <input
                                  type="password"
                                  value={formData.newPassword}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      newPassword: e.target.value,
                                    })
                                  }
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono"
                                />
                              </div>
                            </div>
                          )}
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white py-3.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-950/40 cursor-pointer"
                          >
                            {actionLoading ? (
                              <RefreshCcw className="animate-spin" size={16} />
                            ) : (
                              <Save size={16} />
                            )}
                            Commit Updates
                          </button>
                        </form>
                      </div>
                    )}

                    {activeTab === "mfa" && (
                      <div className="space-y-6">
                        <div className="bg-[#05070a] border border-white/5 rounded-2xl p-6 shadow-xl">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-3 rounded-xl border ${
                                  user.mfa_enabled
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}
                              >
                                {user.mfa_enabled ? (
                                  <ShieldCheck size={24} />
                                ) : (
                                  <ShieldAlert size={24} />
                                )}
                              </div>
                              <div>
                                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                                  Two-Factor Authentication
                                </h2>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                  Status:{" "}
                                  <span
                                    className={
                                      user.mfa_enabled
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }
                                  >
                                    {user.mfa_enabled
                                      ? "Active Protection"
                                      : "Unsecured"}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleMfaToggle}
                              className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                                user.mfa_enabled
                                  ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                                  : "bg-gray-800 border border-white/10"
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                  user.mfa_enabled
                                    ? "translate-x-6"
                                    : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {qr && (
                          <div className="p-6 bg-[#05070a] border border-white/5 rounded-2xl shadow-xl animate-in fade-in duration-300">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                              <div className="relative group shrink-0">
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative p-4 bg-white rounded-xl shadow-xl">
                                  <img
                                    src={qr}
                                    alt="MFA QR Code"
                                    className="w-44 h-44 object-contain"
                                  />
                                </div>
                              </div>

                              <div className="flex-1 space-y-6 w-full">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-cyan-400">
                                    <Smartphone size={18} />
                                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                                      Sync Authenticator
                                    </h3>
                                  </div>
                                  <p className="text-gray-400 text-xs font-mono leading-relaxed">
                                    Scan the code using Google Authenticator or
                                    Authy, then enter your 6-digit sync code.
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                                    Input Verification Code
                                  </label>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                      value={code}
                                      onChange={(e) =>
                                        setCode(
                                          e.target.value.replace(/\D/g, "")
                                        )
                                      }
                                      maxLength={6}
                                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 text-xl font-black text-center tracking-[0.4em] text-cyan-400 placeholder:opacity-20 font-mono"
                                      placeholder="000000"
                                    />
                                    <button
                                      onClick={confirmSetup}
                                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-950/40"
                                    >
                                      Verify
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {msg && (
                      <div className="mt-4 p-4 bg-[#05070a] border border-white/5 rounded-xl text-center">
                        <p className="text-xs font-mono font-bold uppercase text-cyan-400 tracking-wider animate-pulse">
                          {msg}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.4); }
      `}</style>
    </div>
  );
};

export default Settings;
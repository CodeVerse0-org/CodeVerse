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
  CheckCircle2,
} from "lucide-react";

// Components
import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const DeveloperSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // User & MFA State
  const [user, setUser] = useState({
    id: null,
    first_name: localStorage.getItem("user_fname") || "",
    last_name: localStorage.getItem("user_lname") || "",
    email: "",
    mfa_enabled: false,
  });

  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  // Form Data
  const [formData, setFormData] = useState({
    firstName: localStorage.getItem("user_fname") || "",
    lastName: localStorage.getItem("user_lname") || "",
    currentPassword: "",
    newPassword: "",
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.replace(/^http:\/\//i, "https://");

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const fetchInitialData = useCallback(async () => {
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
      const userId = payload.sub;

      const [userRes, mfaRes] = await Promise.all([
        fetch(`${API_URL}/auth/me`, { headers }),
        fetch(`${API_URL}/mfa/status/${userId}`, { headers }),
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setUser((prev) => ({ ...prev, ...data, id: userId }));
        setFormData((prev) => ({
          ...prev,
          firstName: data.first_name || "",
          lastName: data.last_name || "",
        }));
        if (data.first_name)
          localStorage.setItem("user_fname", data.first_name);
        if (data.last_name) localStorage.setItem("user_lname", data.last_name);
      }

      if (mfaRes.ok) {
        const mfaData = await mfaRes.json();
        setUser((prev) => ({
          ...prev,
          mfa_enabled: Boolean(mfaData.mfa_enabled),
        }));
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- PROFILE UPDATE LOGIC ---
  const validatePassword = (pass) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (activeTab === "security_pass") {
      if (formData.currentPassword === formData.newPassword) {
        setMsg("ERROR: New password must differ from current.");
        return;
      }
      if (!validatePassword(formData.newPassword)) {
        setMsg("COMPLEXITY ERROR: 8+ chars, Upper, Number, Special required.");
        return;
      }
    }

    setActionLoading(true);
    setMsg("Synchronizing with Database...");
    const token = localStorage.getItem("token");
    const endpoint =
      activeTab === "general"
        ? "/api/user/update-name"
        : "/api/user/change-password";

    const body =
      activeTab === "general"
        ? { firstName: formData.firstName, lastName: formData.lastName }
        : {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMsg("✅ Data Synchronized Successfully.");
        if (activeTab === "general") {
          setUser((prev) => ({
            ...prev,
            first_name: formData.firstName,
            last_name: formData.lastName,
          }));
          localStorage.setItem("user_fname", formData.firstName);
          localStorage.setItem("user_lname", formData.lastName);
        } else {
          setFormData({ ...formData, currentPassword: "", newPassword: "" });
        }
      } else {
        const data = await res.json();
        setMsg(`❌ Access Denied: ${data.detail || "Failed"}`);
      }
    } catch (err) {
      setMsg("❌ System Error: Connection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- MFA LOGIC ---
  const handleMfaToggle = async () => {
    const token = localStorage.getItem("token");
    if (user.mfa_enabled) {
      if (
        !window.confirm(
          "Protocol Breach: Disabling MFA will reduce security. Proceed?",
        )
      )
        return;
      const res = await fetch(`${API_URL}/mfa/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) {
        setUser({ ...user, mfa_enabled: false });
        setMsg("⚠️ MFA Protocol Deactivated");
      }
    } else {
      enableMFA();
    }
  };

  const enableMFA = async () => {
    setActionLoading(true);
    setMsg("Generating Secure Secret...");
    try {
      const res = await fetch(`${API_URL}/mfa/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const qrImg = await QRCode.toDataURL(data.otpauth_url);
        setQr(qrImg);
        setMsg("Scan QR Code to Link Device");
      } else {
        setMsg("❌ Failed to initialize MFA");
      }
    } catch (err) {
      setMsg("❌ Failed to generate secret.");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmMfaSetup = async () => {
    setActionLoading(true);
    const res = await fetch(`${API_URL}/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, token: code }),
    });
    if (res.ok) {
      setUser({ ...user, mfa_enabled: true });
      setQr("");
      setCode("");
      setMsg("✅ MFA Protection Fully Enabled");
    } else {
      setMsg("❌ Invalid Verification Code");
    }
    setActionLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      {/* Developer Navbar */}
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden relative">
        <DeveloperSidebar
          user={user}
          isOpen={isSidebarOpen}
          loading={loading}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#010203]">
          {/* Top Breadcrumb Header Bar */}
          <header className="h-12 border-b border-white/5 flex items-center px-6 bg-black/40 backdrop-blur-xl shrink-0 z-10">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-gray-500">
              System_Core / Config /{" "}
              <span className="text-cyan-400">{activeTab}</span>
            </h2>
          </header>

          <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl w-full mx-auto space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                      Environment Config
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    DEVELOPER SETTINGS
                  </h1>
                </div>
                <p className="text-xs text-gray-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Active Identity:{" "}
                  <span className="text-cyan-400 font-bold">
                    {user.first_name || "Developer"} {user.last_name || ""}
                  </span>
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-3">
                  <Loader2 className="animate-spin text-cyan-500" size={36} />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-500/80 font-mono font-bold">
                    Initializing Terminal...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* TAB NAVIGATION */}
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
                      <User size={16} /> Profile Info
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
                      <Fingerprint size={16} /> 2FA Protocol
                    </button>
                  </div>

                  {/* CONTENT AREA */}
                  <div className="flex-1 space-y-6">
                    {/* PROFILE & PASSWORD FORMS */}
                    {(activeTab === "general" ||
                      activeTab === "security_pass") && (
                      <div className="bg-[#05070a] border border-white/5 rounded-2xl p-8 shadow-xl animate-in fade-in duration-300">
                        <form onSubmit={handleUpdate} className="space-y-6">
                          {activeTab === "general" ? (
                            <div className="grid grid-cols-1 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                                  Identity: First_Name
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
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono placeholder:text-gray-700"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                                  Identity: Last_Name
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
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono placeholder:text-gray-700"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-5">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                                  Validation: Current_Pass
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
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-rose-500/50 outline-none transition-all font-mono placeholder:text-gray-700"
                                  placeholder="••••••••"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                                  Override: New_Pass
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
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono placeholder:text-gray-700"
                                  placeholder="MIN 8 CHARS + UPPER + NUMBER + SYMBOL"
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
                            )}{" "}
                            Commit Changes
                          </button>
                        </form>
                      </div>
                    )}

                    {/* MFA SECTION */}
                    {activeTab === "mfa" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-[#05070a] border border-white/5 rounded-2xl p-6 shadow-xl">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-3 rounded-xl border ${
                                  user.mfa_enabled
                                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
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
                                  TOTP Gatekeeper
                                </h2>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                  Status:{" "}
                                  <span
                                    className={
                                      user.mfa_enabled
                                        ? "text-cyan-400"
                                        : "text-rose-400"
                                    }
                                  >
                                    {user.mfa_enabled
                                      ? "Active_Shield"
                                      : "Bypassed_Vulnerable"}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={handleMfaToggle}
                                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer ${
                                  user.mfa_enabled
                                    ? "bg-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
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
                              <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                                {user.mfa_enabled ? "Online" : "Offline"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!user.mfa_enabled && !qr && (
                          <div className="bg-[#05070a] border border-white/5 rounded-2xl p-10 text-center space-y-5 shadow-xl">
                            <div className="flex justify-center gap-4 text-gray-600">
                              <Smartphone
                                size={36}
                                className="animate-bounce text-cyan-500/60"
                              />
                              <CheckCircle2
                                size={36}
                                className="text-gray-500"
                              />
                            </div>
                            <div className="max-w-md mx-auto space-y-1">
                              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                                Initialize Layer-2 Security
                              </h3>
                              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                                Enable Two-Factor Authentication to guarantee
                                that only authorized hardware hardware endpoints
                                access your developer stack.
                              </p>
                            </div>
                            <button
                              onClick={enableMFA}
                              disabled={actionLoading}
                              className="px-6 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/50 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-md"
                            >
                              {actionLoading
                                ? "Processing..."
                                : "Request Secure Secret"}
                            </button>
                          </div>
                        )}

                        {qr && (
                          <div className="p-6 bg-[#05070a] border border-white/5 rounded-2xl shadow-xl animate-in fade-in duration-300">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                              <div className="relative group shrink-0">
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative p-4 bg-white rounded-xl shadow-xl">
                                  <img
                                    src={qr}
                                    alt="MFA QR"
                                    className="w-44 h-44 object-contain"
                                  />
                                </div>
                              </div>

                              <div className="flex-1 space-y-6 w-full">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-cyan-400">
                                    <Smartphone size={18} />
                                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                                      Identity Sync
                                    </h3>
                                  </div>
                                  <p className="text-gray-400 text-xs font-mono leading-relaxed">
                                    Input the 6-digit temporal code from your
                                    authenticator device to finalize the
                                    protocol handshake.
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
                                          e.target.value.replace(/\D/g, ""),
                                        )
                                      }
                                      maxLength={6}
                                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 text-xl font-black text-center tracking-[0.4em] text-cyan-400 placeholder:opacity-20 font-mono"
                                      placeholder="000000"
                                    />
                                    <button
                                      onClick={confirmMfaSetup}
                                      disabled={
                                        code.length !== 6 || actionLoading
                                      }
                                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-cyan-950/40"
                                    >
                                      {actionLoading
                                        ? "Syncing..."
                                        : "Finalize Protocol"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {user.mfa_enabled && !qr && (
                          <div className="p-8 bg-[#05070a] border border-white/5 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-xl">
                            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 relative">
                              <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-20"></div>
                              <ShieldCheck size={28} />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                                System Fortified
                              </h3>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                                Encrypted Identity Verification Active
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STATUS MESSAGES */}
                    {msg && (
                      <div className="p-4 bg-[#05070a] border border-white/5 rounded-xl text-center shadow-md">
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

export default DeveloperSettings;

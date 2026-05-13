import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { 
  ShieldCheck, ShieldAlert, Key, Fingerprint, Loader2, 
  Smartphone, User, Lock, Save, RefreshCcw 
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import DeveloperNavbar from "../components/AdminNavbar";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general"); 
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [user, setUser] = useState({ id: null, mfa_enabled: false });
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    currentPassword: "",
    newPassword: "",
  });

  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Toggle Sidebar visibility
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = parseInt(payload.sub);

        const [adminRes, statusRes, mfaRes] = await Promise.all([
          fetch(`${API_URL}/auth/me`, { headers }),
          fetch(`${API_URL}/api/github/status`, { headers }),
          fetch(`${API_URL}/mfa/status/${userId}`, { headers })
        ]);

        if (adminRes.ok) {
          const data = await adminRes.json();
          setAdmin({ name: `${data.first_name} ${data.last_name}`, email: data.email });
          setFormData(f => ({ ...f, firstName: data.first_name, lastName: data.last_name }));
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsConnected(statusData.connected);
        }

        if (mfaRes.ok) {
          const mfaData = await mfaRes.json();
          setUser({ id: userId, mfa_enabled: mfaData.mfa_enabled });
        }
      } catch (err) {
        console.error("Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [API_URL, navigate]);

  // Handle Profile and Password Updates
  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg("Processing Request...");
    
    const token = localStorage.getItem("token");
    const endpoint = activeTab === "general" ? "/auth/update-profile" : "/auth/change-password";
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMsg("✅ System Records Updated");
        if (activeTab === "general") {
          setAdmin(prev => ({ ...prev, name: `${formData.firstName} ${formData.lastName}` }));
        }
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
      } else {
        setMsg("❌ Update Failed: Verify Credentials");
      }
    } catch (err) {
      setMsg("❌ Connection Error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMfaToggle = async () => {
    const token = localStorage.getItem("token");
    if (user.mfa_enabled) {
      if (!window.confirm("Disabling MFA reduces security. Proceed?")) return;
      const res = await fetch(`${API_URL}/mfa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) {
        setUser({ ...user, mfa_enabled: false });
        setMsg("MFA Protocol Deactivated");
      }
    } else {
      enableMFA();
    }
  };

  const enableMFA = async () => {
    setMsg("Requesting Secret...");
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
        setMsg("");
      } else {
        setMsg("Failed to initialize MFA");
      }
    } catch (err) {
      setMsg("Connection Error");
    }
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
      setMsg("✅ Admin Protection Enabled");
    } else {
      setMsg("❌ Invalid Code");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar admin={admin} isConnected={isConnected} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <main className="flex-1 p-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              
              <header className="mb-12">
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  Admin<span className="text-cyan-500"> Settings</span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-[.4em] font-bold mt-2">
                 Active Admin: {admin.name}
                </p>
              </header>

              {loading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <Loader2 className="animate-spin text-cyan-500" size={40} />
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Synchronizing Profiles...</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-10">
                  
                  {/* Vertical Tabs */}
                  <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
                    <button 
                      onClick={() => { setActiveTab("general"); setMsg(""); }} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === "general" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <User size={18} /> Admin Profile
                    </button>
                    <button 
                      onClick={() => { setActiveTab("security_pass"); setMsg(""); }} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === "security_pass" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <Lock size={18} /> Credentials
                    </button>
                    <button 
                      onClick={() => { setActiveTab("mfa"); setMsg(""); }} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === "mfa" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <Fingerprint size={18} /> MFA Security
                    </button>
                  </div>

                  {/* Content Panels */}
                  <div className="flex-1">
                    
                    {(activeTab === "general" || activeTab === "security_pass") && (
                      <div className="bg-black/40 border border-white/5 rounded-[40px] p-12 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <form onSubmit={handleUpdate} className="space-y-10">
                          {activeTab === "general" ? (
                            <div className="grid grid-cols-1 gap-8">
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">First Name</label>
                                <input 
                                  type="text" 
                                  value={formData.firstName} 
                                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 outline-none transition-all" 
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">Last Name</label>
                                <input 
                                  type="text" 
                                  value={formData.lastName} 
                                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 outline-none transition-all" 
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-8">
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-rose-500">Current Password</label>
                                <input 
                                  type="password" 
                                  value={formData.currentPassword} 
                                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-rose-500 outline-none transition-all" 
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">New Password</label>
                                <input 
                                  type="password" 
                                  value={formData.newPassword} 
                                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 outline-none transition-all" 
                                />
                              </div>
                            </div>
                          )}
                          <button 
                            type="submit" 
                            disabled={actionLoading} 
                            className="w-full flex items-center justify-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[.4em] transition-all"
                          >
                            {actionLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />} Commit Updates
                          </button>
                        </form>
                      </div>
                    )}

                    {activeTab === "mfa" && (
                      <div className="space-y-6">
                        {/* MFA Card and QR Logic Remains Same */}
                        <div className="bg-black/40 border border-white/5 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-5">
                              <div className={`p-4 rounded-2xl ${user.mfa_enabled ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                {user.mfa_enabled ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                              </div>
                              <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Two-Factor Auth</h2>
                                <p className="text-sm text-gray-500">Status: {user.mfa_enabled ? 'Active Protection' : 'Unsecured'}</p>
                              </div>
                            </div>
                            <button
                              onClick={handleMfaToggle}
                              className={`w-14 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${
                                user.mfa_enabled ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-gray-800"
                              }`}
                            >
                              <div className={`bg-white w-5 h-5 rounded-full shadow-lg transform transition-transform duration-300 ${
                                user.mfa_enabled ? "translate-x-7" : "translate-x-0"
                              }`} />
                            </button>
                          </div>
                        </div>
                        {qr && (
                          <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row items-center gap-12">
                              <div className="relative group shrink-0">
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative p-6 bg-white rounded-[2.2rem] shadow-2xl">
                                  <img src={qr} alt="MFA QR" className="w-56 h-56 md:w-64 md:h-64 object-contain" />
                                </div>
                              </div>

                              <div className="flex-1 space-y-8 w-full">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3 text-cyan-400">
                                    <Smartphone size={24} />
                                    <h3 className="text-sm font-black uppercase tracking-[.3em]">Sync Authenticator</h3>
                                  </div>
                                  <p className="text-gray-400 leading-relaxed text-sm max-w-md">
                                    Scan the code with Google Authenticator or Authy. Enter the generated 6-digit sync code below.
                                  </p>
                                </div>

                                <div className="space-y-4">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Input Code</label>
                                  <div className="flex flex-col sm:flex-row gap-4">
                                    <input
                                      value={code}
                                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                      maxLength={6}
                                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-cyan-500/50 text-3xl font-black text-center tracking-[0.6em] text-cyan-400 placeholder:opacity-10 transition-all"
                                      placeholder="000000"
                                    />
                                    <button 
                                      onClick={confirmSetup} 
                                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[.2em] transition-all active:scale-95"
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
                    {msg && <p className="mt-6 text-center text-[10px] font-black uppercase text-cyan-400 tracking-widest animate-pulse">{msg}</p>}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { 
  ShieldCheck, ShieldAlert, Key, Fingerprint, Loader2, 
  Smartphone, User, Lock, Save, RefreshCcw 
} from "lucide-react";

// Components
import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const DeveloperSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general"); // Matches your ProfilePage logic
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // User & MFA State
  const [user, setUser] = useState({
    id: null,
    first_name: localStorage.getItem("user_fname") || "",
    last_name: localStorage.getItem("user_lname") || "",
    email: "",
    mfa_enabled: false 
  });

  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  // Form Data (Kept exactly as your ProfilePage)
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

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub;

        const [userRes, mfaRes] = await Promise.all([
          fetch(`${API_URL}/auth/me`, { headers }),
          fetch(`${API_URL}/mfa/status/${userId}`, { headers })
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setUser(prev => ({ ...prev, ...data, id: userId }));
          setFormData(prev => ({ ...prev, firstName: data.first_name, lastName: data.last_name }));
          localStorage.setItem("user_fname", data.first_name);
          localStorage.setItem("user_lname", data.last_name);
        }

        if (mfaRes.ok) {
          const mfaData = await mfaRes.json();
          setUser(prev => ({ ...prev, mfa_enabled: mfaData.mfa_enabled }));
        }
      } catch (err) {
        console.error("Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [API_URL, navigate]);

  // --- PROFILE UPDATE LOGIC (Same as your ProfilePage) ---
  const validatePassword = (pass) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (activeTab === "security_pass") {
      if (formData.currentPassword === formData.newPassword) {
        alert("Security Alert: New password cannot be the same as current.");
        return;
      }
      if (!validatePassword(formData.newPassword)) {
        alert("Complexity Error: 8+ chars, 1 Uppercase, 1 Number, 1 Special Char.");
        return;
      }
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    const endpoint = activeTab === "general" ? "/api/user/update-name" : "/api/user/change-password";
    
    const body = activeTab === "general" 
      ? { firstName: formData.firstName, lastName: formData.lastName }
      : { currentPassword: formData.currentPassword, newPassword: formData.newPassword };

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
        alert("Database Synchronized.");
        if (activeTab === "general") {
          setUser(prev => ({ ...prev, first_name: formData.firstName, last_name: formData.lastName }));
          localStorage.setItem("user_fname", formData.firstName);
          localStorage.setItem("user_lname", formData.lastName);
        } else {
          setFormData({ ...formData, currentPassword: "", newPassword: "" });
        }
      } else {
        const data = await res.json();
        alert(`Access Denied: ${data.detail || "Failed"}`);
      }
    } catch (err) {
      alert("System Error: Connection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- MFA LOGIC ---
  const handleMfaToggle = async () => {
    if (user.mfa_enabled) {
      if (!window.confirm("Disabling MFA will reduce security. Proceed?")) return;
      const res = await fetch(`${API_URL}/mfa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setMsg("Generating Secure Secret...");
    const res = await fetch(`${API_URL}/mfa/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });
    const data = await res.json();
    const qrImg = await QRCode.toDataURL(data.otpauth_url);
    setQr(qrImg);
    setMsg("");
  };

  const confirmMfaSetup = async () => {
    const res = await fetch(`${API_URL}/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, token: code }),
    });
    if (res.ok) {
      setUser({ ...user, mfa_enabled: true });
      setQr("");
      setCode("");
      setMsg("✅ MFA Protection Enabled");
    } else {
      setMsg("❌ Invalid Verification Code");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">System / Settings</h2>
          </header>

          <main className="flex-1 p-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="max-w-5xl mx-auto">
              
              <header className="mb-12">
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  Developer<span className="text-cyan-500"> Settings</span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-[.4em] font-bold mt-2">
                  Active Developer: {user.first_name} {user.last_name}
                </p>
              </header>

              {loading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <Loader2 className="animate-spin text-cyan-500" size={40} />
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Initialising...</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-10">
                  
                  {/* TAB NAVIGATION (From your ProfilePage) */}
                  <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
                    <button 
                      onClick={() => setActiveTab("general")} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === "general" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <User size={18} /> Profile Name
                    </button>
                    <button 
                      onClick={() => setActiveTab("security_pass")} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === "security_pass" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <Lock size={18} /> Credentials
                    </button>
                    <button 
                      onClick={() => setActiveTab("mfa")} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        activeTab === "mfa" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <Fingerprint size={18} /> 2FA Security
                    </button>
                  </div>

                  {/* CONTENT AREA */}
                  <div className="flex-1">
                    
                    {/* PROFILE & PASSWORD FORMS */}
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
                                  placeholder="••••••••" 
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">New Password</label>
                                <input 
                                  type="password" 
                                  value={formData.newPassword} 
                                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-cyan-500 outline-none transition-all" 
                                  placeholder="MIN 8 CHARS + SYMBOL" 
                                />
                              </div>
                            </div>
                          )}
                          <button 
                            type="submit" 
                            disabled={actionLoading} 
                            className="w-full flex items-center justify-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[.4em] transition-all disabled:opacity-30"
                          >
                            {actionLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />} Update Data
                          </button>
                        </form>
                      </div>
                    )}

                    {/* MFA SECTION */}
                    {activeTab === "mfa" && (
                      <div className="bg-black/40 border border-white/5 rounded-[40px] p-10 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start mb-10">
                          <div className="flex gap-5">
                            <div className={`p-4 rounded-2xl ${user.mfa_enabled ? "bg-cyan-500/10 text-cyan-500" : "bg-red-500/10 text-red-500"}`}>
                              {user.mfa_enabled ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-white uppercase tracking-tight">Two-Factor Auth</h2>
                              <p className="text-sm text-gray-500">Secure your developer session via TOTP.</p>
                            </div>
                          </div>
                          <button
                            onClick={handleMfaToggle}
                            className={`w-14 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${
                              user.mfa_enabled ? "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-gray-800"
                            }`}
                          >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-lg transform transition-transform duration-300 ${
                              user.mfa_enabled ? "translate-x-7" : "translate-x-0"
                            }`} />
                          </button>
                        </div>

                        {qr && (
                          <div className="flex flex-col md:flex-row gap-10 items-center border-t border-white/5 pt-10 mt-10">
                            <div className="p-4 bg-white rounded-3xl">
                              <img src={qr} alt="MFA QR" className="w-40 h-40" />
                            </div>
                            <div className="flex-1 space-y-6">
                              <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">Authenticator Setup</h3>
                              <p className="text-sm text-gray-400">Scan and enter the code below.</p>
                              <div className="flex gap-3">
                                <input
                                  value={code}
                                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                  maxLength={6}
                                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 outline-none text-2xl font-black text-center tracking-[0.5em] text-cyan-400"
                                  placeholder="000000"
                                />
                                <button onClick={confirmMfaSetup} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 rounded-xl font-black text-xs uppercase transition-all">Verify</button>
                              </div>
                            </div>
                          </div>
                        )}
                        {msg && <p className="mt-6 text-center text-[10px] font-black uppercase text-cyan-400 tracking-widest">{msg}</p>}
                      </div>
                    )}

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

export default DeveloperSettings;
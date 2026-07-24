import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { 
  ShieldCheck, ShieldAlert, Key, Fingerprint, Loader2, 
  Smartphone, User, Lock, Save, RefreshCcw, CheckCircle2 
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
    mfa_enabled: false 
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
        setMsg("✅ Data Synchronized Successfully.");
        if (activeTab === "general") {
          setUser(prev => ({ ...prev, first_name: formData.firstName, last_name: formData.lastName }));
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
    if (user.mfa_enabled) {
      if (!window.confirm("Protocol Breach: Disabling MFA will reduce security. Proceed?")) return;
      const res = await fetch(`${API_URL}/mfa/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const qrImg = await QRCode.toDataURL(data.otpauth_url);
        setQr(qrImg);
        setMsg("Scan QR Code to Link Device");
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
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-[10px] font-black uppercase tracking-[.4em] text-gray-500">System_Core / Config / {activeTab}</h2>
          </header>

          <main className="flex-1 p-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="max-w-5xl mx-auto">
              
              <header className="mb-12">
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  Developer<span className="text-cyan-500"> Settings</span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-[.4em] font-bold mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                  Active Identity: {user.first_name} {user.last_name}
                </p>
              </header>

              {loading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <Loader2 className="animate-spin text-cyan-500" size={40} />
                  <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Initialising Terminal...</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-10">
                  
                  {/* TAB NAVIGATION */}
                  <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
                    <button 
                      onClick={() => { setActiveTab("general"); setMsg(""); }} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === "general" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <User size={18} /> Profile Info
                    </button>
                    <button 
                      onClick={() => { setActiveTab("security_pass"); setMsg(""); }} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === "security_pass" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <Lock size={18} /> Credentials
                    </button>
                    <button 
                      onClick={() => { setActiveTab("mfa"); setMsg(""); }} 
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === "mfa" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                      }`}
                    >
                      <Fingerprint size={18} /> 2FA Protocol
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
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">Identity: First_Name</label>
                                <input 
                                  type="text" 
                                  value={formData.firstName} 
                                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-gray-700" 
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">Identity: Last_Name</label>
                                <input 
                                  type="text" 
                                  value={formData.lastName} 
                                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-gray-700" 
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-8">
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-rose-500">Validation: Current_Pass</label>
                                <input 
                                  type="password" 
                                  value={formData.currentPassword} 
                                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-rose-500 outline-none transition-all placeholder:text-gray-700" 
                                  placeholder="••••••••" 
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[.3em] text-cyan-500">Override: New_Pass</label>
                                <input 
                                  type="password" 
                                  value={formData.newPassword} 
                                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-cyan-500 outline-none transition-all placeholder:text-gray-700" 
                                  placeholder="MIN 8 CHARS + SYMBOL" 
                                />
                              </div>
                            </div>
                          )}
                          <button 
                            type="submit" 
                            disabled={actionLoading} 
                            className="w-full flex items-center justify-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[.4em] transition-all disabled:opacity-30 shadow-lg shadow-cyan-500/10"
                          >
                            {actionLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />} Commit Changes
                          </button>
                        </form>
                      </div>
                    )}

                    {/* MFA SECTION */}
                    {activeTab === "mfa" && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="bg-black/60 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-2xl">
                          {/* Header Banner */}
                          <div className="bg-gradient-to-r from-cyan-900/20 to-transparent p-10 border-b border-white/5">
                            <div className="flex justify-between items-center">
                              <div className="flex gap-6">
                                <div className={`p-5 rounded-2xl border ${
                                  user.mfa_enabled 
                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                                    : "bg-rose-500/10 border-rose-500/50 text-rose-500"
                                }`}>
                                  {user.mfa_enabled ? <ShieldCheck size={38} /> : <ShieldAlert size={38} />}
                                </div>
                                <div>
                                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                    TOTP <span className="text-cyan-500">Gatekeeper</span>
                                  </h2>
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                    Status: {user.mfa_enabled ? "Active_Shield" : "Bypassed_Vulnerable"}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={handleMfaToggle}
                                  className={`group relative w-16 h-8 flex items-center rounded-full px-1 transition-all duration-500 ${
                                    user.mfa_enabled ? "bg-cyan-600" : "bg-gray-800"
                                  }`}
                                >
                                  <div className={`bg-white w-6 h-6 rounded-full shadow-xl transform transition-transform duration-500 ease-out ${
                                    user.mfa_enabled ? "translate-x-8" : "translate-x-0"
                                  }`} />
                                </button>
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">
                                  {user.mfa_enabled ? "Online" : "Offline"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-10">
                            {!user.mfa_enabled && !qr && (
                              <div className="text-center py-10 space-y-6">
                                <div className="flex justify-center gap-6 text-gray-800">
                                  <Smartphone size={48} className="animate-bounce" />
                                  <CheckCircle2 size={48} />
                                </div>
                                <div className="max-w-md mx-auto">
                                  <h3 className="text-lg font-bold text-white uppercase italic">Initialize Layer-2 Security</h3>
                                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    By enabling Two-Factor Authentication, you ensure that only authorized hardware can access your developer environment.
                                  </p>
                                </div>
                                <button 
                                  onClick={enableMFA}
                                  className="px-10 py-5 bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-xl text-[11px] font-black uppercase tracking-[.3em] text-white transition-all"
                                >
                                  Request Secure Secret
                                </button>
                              </div>
                            )}

                            {qr && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-in fade-in zoom-in-95 duration-500">
                                {/* Left: QR Display */}
                                <div className="relative group">
                                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                  <div className="relative bg-[#080808] border border-white/10 p-8 rounded-3xl flex flex-col items-center">
                                    <div className="p-3 bg-white rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                      <img src={qr} alt="MFA QR" className="w-48 h-48 mix-blend-multiply" />
                                    </div>
                                    <div className="mt-6 text-center">
                                      <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Dynamic Sync ID</p>
                                      <p className="text-[9px] text-gray-600 mt-2 uppercase leading-tight">Link your device via<br/>Authenticator App</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Verification Form */}
                                <div className="space-y-8">
                                  <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Identity Sync</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                      Input the 6-digit temporal code from your device to finalize the security handshake.
                                    </p>
                                  </div>

                                  <div className="space-y-6">
                                    <div className="relative">
                                      <input
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                        maxLength={6}
                                        className="w-full bg-white/[0.02] border-b-2 border-white/10 focus:border-cyan-500 py-6 outline-none text-4xl font-black text-center tracking-[0.8em] text-cyan-400 transition-all placeholder:text-gray-900"
                                        placeholder="000000"
                                      />
                                      {actionLoading && (
                                        <div className="absolute top-0 right-0 p-2">
                                            <Loader2 size={16} className="animate-spin text-cyan-500" />
                                        </div>
                                      )}
                                    </div>

                                    <button 
                                      onClick={confirmMfaSetup} 
                                      disabled={code.length !== 6 || actionLoading}
                                      className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[.4em] transition-all shadow-lg shadow-cyan-500/10"
                                    >
                                      {actionLoading ? "Processing Sync..." : "Finalize Protocol"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {user.mfa_enabled && (
                               <div className="py-16 flex flex-col items-center text-center space-y-6">
                                  <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 relative">
                                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-20"></div>
                                    <ShieldCheck size={40} />
                                  </div>
                                  <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">System Fortified</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-[.4em] font-bold">Encrypted Identity Verification Active</p>
                                  </div>
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STATUS MESSAGES */}
                    {msg && (
                        <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <p className="text-[10px] font-black uppercase text-cyan-400 tracking-[.4em] text-center">{msg}</p>
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
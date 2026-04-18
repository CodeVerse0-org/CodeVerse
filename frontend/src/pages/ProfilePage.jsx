import React, { useState, useEffect } from "react";
import { User, Lock, Save, RefreshCcw, ShieldCheck } from "lucide-react";
import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";

const ProfilePage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Load from LocalStorage immediately to prevent the 2-second flicker
  const [user, setUser] = useState({
    first_name: localStorage.getItem("user_fname") || "",
    last_name: localStorage.getItem("user_lname") || ""
  });

  const [formData, setFormData] = useState({
    firstName: localStorage.getItem("user_fname") || "",
    lastName: localStorage.getItem("user_lname") || "",
    currentPassword: "",
    newPassword: "",
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // 1. SYNC WITH BACKEND
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const syncedUser = { first_name: data.first_name, last_name: data.last_name };
          
          // Update state and cache
          setUser(syncedUser);
          localStorage.setItem("user_fname", data.first_name);
          localStorage.setItem("user_lname", data.last_name);
          
          setFormData(prev => ({
            ...prev,
            firstName: data.first_name,
            lastName: data.last_name,
          }));
        }
      } catch (err) {
        console.error("Sync Error:", err);
      }
    };
    fetchUserData();
  }, [API_URL]);

  const validatePassword = (pass) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pass);
  };

  // 2. HANDLE DATABASE UPDATE
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (activeTab === "security") {
      if (formData.currentPassword === formData.newPassword) {
        alert("Security Alert: New password cannot be the same as the current password.");
        return;
      }
      if (!validatePassword(formData.newPassword)) {
        alert("Complexity Error: 8+ chars, 1 Uppercase, 1 Number, 1 Special Char.");
        return;
      }
    }

    setLoading(true);
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

      const data = await res.json();

      if (res.ok) {
        alert("Database Synchronized: Changes saved.");
        if (activeTab === "general") {
          // Update both State (for Sidebar) and Cache (for Navigation persistence)
          setUser({ first_name: formData.firstName, last_name: formData.lastName });
          localStorage.setItem("user_fname", formData.firstName);
          localStorage.setItem("user_lname", formData.lastName);
        } else {
          setFormData({ ...formData, currentPassword: "", newPassword: "" });
        }
      } else {
        alert(`Access Denied: ${data.detail || "Authentication failed"}`);
      }
    } catch (err) {
      alert("System Error: Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Pass user state to Sidebar for instant name display */}
        <DeveloperSidebar isOpen={isSidebarOpen} user={user} />

        <main className="flex-1 p-10 lg:p-16 overflow-y-auto custom-scrollbar bg-[#010203]">
          <div className="max-w-4xl mx-auto">
            <header className="mb-12">
              <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                My <span className="text-cyan-500">Profile</span>
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-[.4em] font-bold mt-2">
                Active Record: {user.first_name} {user.last_name}
              </p>
            </header>

            <div className="flex gap-10">
              {/* Tab Navigation */}
              <div className="w-64 flex flex-col gap-3">
                <button 
                  onClick={() => setActiveTab("general")} 
                  className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === "general" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                  }`}
                >
                  <User size={18} /> Name Details
                </button>
                <button 
                  onClick={() => setActiveTab("security")} 
                  className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === "security" ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:bg-white/5'
                  }`}
                >
                  <Lock size={18} /> Credentials
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 bg-black/40 border border-white/5 rounded-[40px] p-12 backdrop-blur-xl shadow-2xl">
                <form onSubmit={handleUpdate} className="space-y-10">
                  {activeTab === "general" ? (
                    <div className="space-y-8">
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
                    <div className="space-y-8">
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
                          placeholder="8+ CHARS, UPPER, NUM, SYMBOL" 
                        />
                      </div>
                    </div>
                  )}
                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full flex items-center justify-center gap-4 bg-cyan-600 hover:bg-cyan-500 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[.4em] transition-all disabled:opacity-30 shadow-xl shadow-cyan-900/20"
                    >
                      {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
                      Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
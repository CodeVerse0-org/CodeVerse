import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  RefreshCcw, 
  Github, 
  UserPlus, 
  ShieldCheck, 
  Activity, 
  Users, 
  Loader2,
  ExternalLink,
  Settings,
  Database
} from "lucide-react";

import Sidebar from "../components/Sidebar"; 
import DeveloperNavbar from "../components/DeveloperNavbar";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState({ name: "", email: "", first_name: "", last_name: "" });
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    pendingInvites: 0,
    activeAnalyses: 0 
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchDashboardData = useCallback(async () => {
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
      const profileRes = await fetch(`${API_URL}/auth/me`, { headers });
      if (profileRes.ok) {
        const userData = await profileRes.json();
        setAdmin({
          ...userData,
          name: `${userData.first_name} ${userData.last_name}`,
        });
      }

      const statusRes = await fetch(`${API_URL}/api/github/status`, { headers });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsGithubConnected(!!statusData.connected);
      }
      
      const usersRes = await fetch(`${API_URL}/api/invite/manage`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setStats({
          totalUsers: usersData.length,
          pendingInvites: usersData.filter(u => u.status === "Pending Invitation").length,
          activeAnalyses: 0 
        });
      }

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleConnectGitHub = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/github/install-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Connect error:", err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar admin={admin} isConnected={isGithubConnected} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Admin Control Center</h2>
          </header> */}

          <main className="flex-1 p-10 flex gap-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-cyan-500" size={40} />
                <span className="text-sm uppercase tracking-widest text-gray-500 font-semibold">Syncing System Data...</span>
              </div>
            ) : (
              <div className="flex-1">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-10 text-left">
                  <div>
                    <h1 className="text-4xl font-extrabold text-white flex items-center gap-4 tracking-tight">
                      Admin Dashboard<ShieldCheck className="text-cyan-500" size={36} />
                    </h1>
                    <p className="text-sm text-gray-400 mt-2">Real-time status of your organization and connected developers.</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => navigate("/invite-users")}
                      className="bg-[#134e4e] text-cyan-50 px-6 py-3 rounded-lg text-sm font-bold hover:bg-[#1a6b6b] transition-all flex items-center gap-3 shadow-lg shadow-cyan-900/20"
                    >
                      <UserPlus size={20} /> INVITE DEVELOPER
                    </button>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                  {/* GitHub Card */}
                  <div className="bg-black/20 border border-white/10 p-8 rounded-2xl backdrop-blur-sm relative group hover:border-cyan-500/30 transition-all">
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-bold">Integration</p>
                    <h3 className="text-2xl font-bold text-white mb-2">GitHub App</h3>
                    <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${isGithubConnected ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500 animate-pulse"}`}></span>
                        <span className={`text-sm font-mono font-bold ${isGithubConnected ? "text-green-400" : "text-red-400"}`}>
                            {isGithubConnected ? "CONNECTED" : "ACTION REQUIRED"}
                        </span>
                    </div>
                    {!isGithubConnected && (
                      <button 
                        onClick={handleConnectGitHub}
                        className="mt-6 w-full py-3 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/20 rounded-xl text-xs font-black text-cyan-400 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter"
                      >
                        <Github size={16} /> Link GitHub Org
                      </button>
                    )}
                  </div>

                  {/* Total Users Card */}
                  <div className="bg-black/20 border border-white/10 p-8 rounded-2xl backdrop-blur-sm cursor-pointer hover:border-cyan-500/30 transition-all"
                       onClick={() => navigate("/users")}>
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-bold">User Access</p>
                    <h3 className="text-2xs font-bold text-white mb-2">Total Members</h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-black text-white tracking-tighter">{stats.totalUsers}</span>
                        <span className="text-sm text-gray-500 font-medium">Developer Account(s)</span>
                    </div>
                    {stats.pendingInvites > 0 && (
                        <p className="text-xs text-yellow-500 mt-4 font-bold uppercase tracking-wider flex items-center gap-2">
                          <Activity size={12}/> {stats.pendingInvites} PENDING INVITATIONS
                        </p>
                    )}
                  </div>

                  {/* System Health */}
                  {/* <div className="bg-black/20 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-bold">Performance</p>
                    <h3 className="text-2xl font-bold text-white mb-2">API Latency</h3>
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-cyan-400" size={24} />
                        <span className="text-xl text-cyan-400 font-mono font-bold">24ms</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full w-[100%] shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                    </div>
                  </div> */}
                </div>

                {/* Resource Monitoring
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm shadow-xl">
                  <div className="px-8 py-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                    <h2 className="text-lg font-bold text-white tracking-tight">Resource Monitoring</h2>
                    <button onClick={fetchDashboardData} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors">
                        <RefreshCcw size={20} />
                    </button>
                  </div>
                  <div className="p-16 text-center flex flex-col items-center">
                    <Database size={48} className="text-gray-700 mb-6" />
                    <p className="text-base text-gray-400 max-w-md leading-relaxed">
                        All systems operational. Your organization is currently connected to the <span className="text-cyan-400 font-bold">PostgreSQL Main Cluster</span>.
                    </p>
                  </div>
                </div> */}
              </div>
            )}

            {/* Quick Stats Panel */}
            <div className="w-96 shrink-0 space-y-6 hidden 2xl:block">
              <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-xs font-black text-gray-500 uppercase text-center mb-6 tracking-widest border-b border-white/5 pb-4">Admin Shortcuts</h3>
                <div className="space-y-2">
                    <button 
                      onClick={() => navigate("/users")}
                      className="w-full text-left px-4 py-4 text-sm font-bold hover:bg-white/5 rounded-xl transition-all flex items-center gap-4 text-gray-300 group"
                    >
                        <Users size={20} className="group-hover:text-cyan-400" /> Manage User Access
                    </button>
                    <button 
                     onClick={() => navigate("/Settings")}
                     className="w-full text-left px-4 py-4 text-sm font-bold hover:bg-white/5 rounded-xl transition-all flex items-center gap-4 text-gray-300 group">
                        <Settings size={20} className="group-hover:text-cyan-400" /> System Settings
                       
                    </button>
                
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-xs font-black text-gray-500 uppercase text-center mb-6 tracking-widest border-b border-white/5 pb-4">Infrastructure</h3>
                <div className="space-y-6 mt-4">
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Auth Server</span>
                       <span className="text-green-500 font-black font-mono text-xs px-2 py-1 bg-green-500/10 rounded">ONLINE</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">GitHub Hook</span>
                       <span className={`font-black font-mono text-xs px-2 py-1 rounded ${isGithubConnected ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"}`}>
                         {isGithubConnected ? "STABLE" : "MISSING"}
                       </span>
                    </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
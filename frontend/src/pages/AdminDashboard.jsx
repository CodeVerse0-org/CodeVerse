import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Github, ShieldCheck, Users, Loader2, Trash2, 
  LayoutDashboard, ExternalLink, AlertCircle 
} from "lucide-react";
import Sidebar from "../components/Sidebar"; 
import DeveloperNavbar from "../components/DeveloperNavbar";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, activeRepos: 0 });

  // Sidebar persistence
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

  /**
   * Fetches all core dashboard data: Profile, GitHub status, and User stats
   */
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const headers = { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    try {
      // 1. Fetch Admin Profile
      const profileRes = await fetch(`${API_URL}/auth/me`, { headers });
      if (profileRes.ok) {
        const userData = await profileRes.json();
        setAdmin({ 
          ...userData, 
          name: `${userData.first_name} ${userData.last_name}` 
        });
      }

      // 2. Fetch GitHub Connection Status
      const statusRes = await fetch(`${API_URL}/api/github/status`, { headers });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        // Sets boolean true/false based on backend 'github_connected' flag
        setIsGithubConnected(!!statusData.connected);
      }
      
      // 3. Fetch Organization Stats (Total invited developers)
      const usersRes = await fetch(`${API_URL}/api/invite/manage`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setStats(prev => ({
          ...prev,
          totalUsers: usersData.length,
        }));
      }

    } catch (err) {
      console.error("Dashboard Synchronization Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Redirects user to GitHub App installation flow
   */
  const handleConnectGitHub = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/github/install-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Failed to fetch installation URL:", err);
    }
  };

  /**
   * Uninstalls GitHub App and cleans up DB records
   */
  const handleDisconnectGitHub = async () => {
    const confirmDisconnect = window.confirm(
      "Warning: This will uninstall the GitHub App and remove access to all repositories. Continue?"
    );
    if (!confirmDisconnect) return;

    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/github/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // RESET STATE: This immediately shows the "Link GitHub" button again
        setIsGithubConnected(false);
        await fetchDashboardData(); 
      } else {
        alert("Disconnection failed. The app may have already been uninstalled on GitHub.");
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar maintains connection state for navigation visibility */}
        <Sidebar admin={admin} isConnected={isGithubConnected} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <main className="flex-1 p-10 flex flex-col overflow-y-auto bg-[#010203] custom-scrollbar">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-cyan-500" size={40} />
                <span className="text-xs uppercase tracking-[0.2em] text-gray-500 font-bold">
                  Initializing Systems...
                </span>
              </div>
            ) : (
              <div className="max-w-6xl w-full mx-auto">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-12">
                  <div className="text-left">
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter">
                      SYSTEM OVERVIEW <ShieldCheck className="text-cyan-500" size={32} />
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">
                      Manage organization access and GitHub integration protocols.
                    </p>
                  </div>
                </div>

                {/* Dashboard Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                  
                  {/* GitHub Integration Card */}
                  <div className="bg-[#05070a] border border-white/5 p-8 rounded-3xl backdrop-blur-md hover:border-cyan-500/30 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-1">Infrastructure</p>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                          GitHub App <ExternalLink size={14} className="text-gray-600" />
                        </h3>
                      </div>
                      <div className={`p-2 rounded-lg ${isGithubConnected ? "bg-green-500/10" : "bg-red-500/10"}`}>
                         <Github className={isGithubConnected ? "text-green-500" : "text-red-500"} size={20} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                      <span className={`h-2 w-2 rounded-full ${isGithubConnected ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500 animate-pulse"}`}></span>
                      <span className={`text-xs font-mono font-black tracking-widest ${isGithubConnected ? "text-green-400" : "text-red-400"}`}>
                        {isGithubConnected ? "SYSTEMS_ACTIVE" : "CONNECTION_REQUIRED"}
                      </span>
                    </div>

                    {/* Toggle Button: Shows Connect or Disconnect based on current state */}
                    {isGithubConnected ? (
                      <button 
                        onClick={handleDisconnectGitHub}
                        className="w-full py-4 bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 rounded-2xl text-xs font-black text-red-400 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter"
                      >
                        <Trash2 size={16} /> Terminate Connection
                      </button>
                    ) : (
                      <button 
                        onClick={handleConnectGitHub}
                        className="w-full py-4 bg-cyan-950/20 hover:bg-cyan-900/40 border border-cyan-500/20 rounded-2xl text-xs font-black text-cyan-400 transition-all flex items-center justify-center gap-2 uppercase tracking-tighter"
                      >
                        <Github size={16} /> Authorize GitHub Org
                      </button>
                    )}
                  </div>

                  {/* Total Members Card */}
                  <div 
                    className="bg-[#05070a] border border-white/5 p-8 rounded-3xl cursor-pointer hover:border-cyan-500/30 transition-all duration-300"
                    onClick={() => navigate("/users")}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-1">Access Control</p>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">Total Developers</h3>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded-lg">
                         <Users className="text-cyan-500" size={20} />
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-4 mt-4">
                      <span className="text-6xl font-black text-white tracking-tighter">
                        {stats.totalUsers.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        Verified Identities
                      </span>
                    </div>
                  </div>

                </div>

                {/* Optional Status Alert if disconnected */}
                {!isGithubConnected && (
                  <div className="mt-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-center gap-4 text-yellow-500/80">
                    <AlertCircle size={20} />
                    <p className="text-xs font-medium">Repository sync is currently paused. Link your GitHub Organization to resume analysis.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #22c55e; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
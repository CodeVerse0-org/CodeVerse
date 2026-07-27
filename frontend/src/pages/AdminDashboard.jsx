import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Github,
  ShieldCheck,
  Users,
  Loader2,
  Trash2,
  ExternalLink,
  AlertCircle,
  Cpu,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import AdminNavbar from "../components/AdminNavbar";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, activeRepos: 0 });
  const [systemHealth, setSystemHealth] = useState("DEGRADED");

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
          name:
            `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
            userData.email,
        });
      }

      const statusRes = await fetch(`${API_URL}/api/github/status`, {
        headers,
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const connected = !!statusData.connected;
        setIsGithubConnected(connected);
        // Is "degraded" correct? Yes, if GitHub isn't connected, core synchronization pipelines are impaired.
        setSystemHealth(connected ? "SECURE" : "DEGRADED");
      } else {
        setSystemHealth("DEGRADED");
      }

      const usersRes = await fetch(`${API_URL}/api/invite/manage`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setStats((prev) => ({
          ...prev,
          totalUsers: usersData.length,
        }));
      }
    } catch (err) {
      console.error("Telemetry Sync Error:", err);
      setSystemHealth("OFFLINE");
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
      console.error("Failed to fetch installation URL:", err);
    }
  };

  const handleDisconnectGitHub = async () => {
    const confirmDisconnect = window.confirm(
      "Warning: This will terminate GitHub integration hooks. Continue?",
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
        setIsGithubConnected(false);
        setSystemHealth("DEGRADED");
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tooltip descriptions for why status reads SECURE or DEGRADED
  const getStatusReason = () => {
    if (systemHealth === "SECURE") {
      return "Reason: JWT authentication token is valid and GitHub application webhooks are active.";
    } else if (systemHealth === "DEGRADED") {
      return "Reason: GitHub application integration is unlinked or organization hooks are paused.";
    }
    return "Reason: Unable to reach backend services.";
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      {/* Admin Navbar */}
      <AdminNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          admin={admin}
          isConnected={isGithubConnected}
          isOpen={isSidebarOpen}
          loading={loading}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#010203]">
          <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-cyan-500" size={36} />
                <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-500/80 font-mono font-bold">
                  Establishing Secure Handshake...
                </span>
              </div>
            ) : (
              <div className="max-w-6xl w-full mx-auto space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                        Root Access Control
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                      ADMIN DASHBOARD{" "}
                      <ShieldCheck className="text-cyan-500" size={24} />
                    </h1>
                  </div>

                  {/* Status Indicator with Hover Tooltip explaining the state */}
                  <div
                    title={getStatusReason()}
                    className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono cursor-help group relative"
                  >
                    <Activity
                      size={14}
                      className="text-cyan-400 animate-pulse"
                    />
                    <span className="text-gray-400">STATUS:</span>
                    <strong
                      className={
                        systemHealth === "SECURE"
                          ? "text-green-400 tracking-wider"
                          : "text-amber-400 tracking-wider"
                      }
                    >
                      {systemHealth}
                    </strong>

                    {/* Hover Popup Reason Box */}
                    <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#0a0f14] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] text-gray-300 font-sans normal-case leading-relaxed">
                      <span className="font-bold text-cyan-400 block mb-1 uppercase tracking-wider">
                        Reason
                      </span>
                      {getStatusReason()}
                    </div>
                  </div>
                </div>

                {/* Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GitHub Integration */}
                  <div className="bg-[#05070a] border border-white/5 hover:border-cyan-500/30 p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between group shadow-lg">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            GitHub App Integration{" "}
                            <ExternalLink
                              size={14}
                              className="text-gray-500 group-hover:text-cyan-400 transition-colors"
                            />
                          </h3>
                        </div>
                        <div
                          className={`p-2.5 rounded-xl border ${isGithubConnected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
                        >
                          <Github size={18} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 mb-6 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <span
                          className={`h-2 w-2 rounded-full ${isGithubConnected ? "bg-green-400 shadow-[0_0_8px_#22c55e]" : "bg-red-500 animate-pulse"}`}
                        />
                        <span
                          className={`text-[11px] font-mono font-bold tracking-wider ${isGithubConnected ? "text-green-400" : "text-red-400"}`}
                        >
                          {isGithubConnected
                            ? "WEBHOOK_ACTIVE & SYNCED"
                            : "UNAUTHORIZED ORG"}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isGithubConnected ? (
                        <button
                          onClick={handleDisconnectGitHub}
                          className="w-full py-3 bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 rounded-xl text-[11px] font-bold text-red-400 transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                        >
                          <Trash2 size={14} /> Terminate Integration
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectGitHub}
                          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/30 rounded-xl text-[11px] font-black text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-950/40"
                        >
                          <Github size={14} /> Authorize Organization
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Users Overview Card */}
                  <div
                    className="bg-[#05070a] border border-white/5 hover:border-cyan-500/30 p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer group shadow-lg"
                    onClick={() => navigate("/Users")}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] uppercase font-mono tracking-widest text-gray-500 mb-0.5">
                            Access Matrix
                          </p>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Verified Developers{" "}
                            <ArrowUpRight
                              size={14}
                              className="text-gray-500 group-hover:text-cyan-400 transition-colors"
                            />
                          </h3>
                        </div>
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                          <Users size={18} />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-3 mb-6 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-3xl font-black text-white font-mono tracking-tighter">
                          {stats.totalUsers.toString().padStart(2, "0")}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono font-medium uppercase tracking-wider">
                          Active Credentials
                        </span>
                      </div>
                    </div>

                    <div className="w-full py-2.5 bg-white/[0.03] group-hover:bg-cyan-500/10 border border-white/5 group-hover:border-cyan-500/20 rounded-xl text-[11px] font-bold text-gray-400 group-hover:text-cyan-400 transition-all flex items-center justify-center gap-2 uppercase tracking-wider">
                      Inspect Directory <Cpu size={14} />
                    </div>
                  </div>
                </div>

                {!isGithubConnected && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-400 text-xs shadow-inner">
                    <AlertCircle size={18} className="shrink-0" />
                    <p>
                      Live repository indexing is currently paused. Authorize
                      your GitHub organization to reactivate live socket
                      pipelines.
                    </p>
                  </div>
                )}
              </div>
            )}
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

export default AdminDashboard;

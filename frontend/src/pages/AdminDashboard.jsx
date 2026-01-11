import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Bell, RefreshCw, Github, UserPlus } from "lucide-react";

const AdminDashboard = () => {
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
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
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
          });
        }

        const statusRes = await fetch(`${API_URL}/api/github/status`, {
          headers,
        });
        const statusData = await statusRes.json();
        setIsGithubConnected(!!statusData.connected);
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
        setIsGithubConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [API_URL]);

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

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="animate-spin text-cyan-500" size={32} />
      </div>
    );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black via-[#041a1f] to-black text-white font-sans">
      <Sidebar admin={admin} isConnected={isGithubConnected} />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-cyan-50">
            System Overview
          </h1>

          <div className="flex items-center gap-4">
            {/* Invite Users Button */}
            <button
              onClick={() => navigate("/invite-users")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl 
                         bg-cyan-600 hover:bg-cyan-500 
                         text-black text-xs font-bold tracking-wider transition"
            >
              <UserPlus size={16} />
              INVITE USERS
            </button>

            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isGithubConnected
                    ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
                    : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                }`}
              />
              {isGithubConnected
                ? "GitHub Connected"
                : "GitHub Disconnected"}
            </div>

            <Bell size={20} className="text-gray-400" />
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">
              Connection Status
            </p>
            <p
              className={`text-2xl font-black ${
                isGithubConnected ? "text-green-400" : "text-red-500"
              }`}
            >
              {isGithubConnected ? "ONLINE" : "OFFLINE"}
            </p>
            {!isGithubConnected && (
              <button
                onClick={handleConnectGitHub}
                className="mt-3 flex items-center gap-2 text-[10px] font-bold text-cyan-400 hover:text-white transition-colors"
              >
                <Github size={14} /> CONNECT NOW
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 p-20 border border-dashed border-white/5 rounded-3xl text-center">
          <p className="text-gray-600">
            Module specific reporting tools will appear here.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

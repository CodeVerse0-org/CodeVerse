import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Trash2, User, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminNavbar from "../components/AdminNavbar";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [admin, setAdmin] = useState({ name: "", email: "" });

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

  const fetchData = useCallback(async () => {
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
      // 1. Fetch Admin Profile
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

      // 2. Fetch GitHub Integration Status
      const statusRes = await fetch(`${API_URL}/api/github/status`, {
        headers,
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsConnected(!!statusData.connected);
      }

      // 3. Fetch Admin-Scoped Developers & Pending Invites
      const usersRes = await fetch(`${API_URL}/api/invite/manage`, { headers });
      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(userData);
      }
    } catch (err) {
      console.error("User Management Telemetry Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevoke = async (id, isInvite) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this user's credentials?",
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_URL}/api/invite/revoke/${id}?is_invite=${isInvite}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      if (res.ok) {
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      {/* Admin Navbar */}
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
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                      Access Matrix
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    USERS & PERMISSIONS{" "}
                    <Users className="text-cyan-500" size={24} />
                  </h1>
                </div>

                {/* Search & Action Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 transition-all font-mono text-white placeholder:text-gray-600"
                    />
                  </div>
                  <button
                    onClick={() => navigate("/invite-users")}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-950/40 cursor-pointer"
                  >
                    <Plus size={16} />
                    Invite Developer
                  </button>
                </div>
              </div>

              {/* Content Matrix */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-3">
                  <Loader2 className="animate-spin text-cyan-500" size={36} />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-500/80 font-mono font-bold">
                    Querying Access Logs...
                  </span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-[#05070a] border border-white/5 rounded-2xl text-center px-4">
                  <User className="text-gray-600 mb-3" size={36} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                    No Developers Found
                  </h3>
                  <p className="text-xs text-gray-500">
                    No active developer credentials or pending invitations match
                    your search filter.
                  </p>
                </div>
              ) : (
                <div className="bg-[#05070a] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                          <th className="px-6 py-4 font-bold">Identity</th>
                          <th className="px-6 py-4 font-bold">Codebases</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                          <th className="px-6 py-4 font-bold">Timestamp</th>
                          <th className="px-6 py-4 font-bold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                                {user.name}
                              </div>
                              <div className="text-gray-500 text-[11px] font-mono mt-0.5">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-400 font-mono">
                              {user.repo_count ?? 0}{" "}
                              {user.repo_count === 1
                                ? "Repository"
                                : "Repositories"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                  user.is_invite
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-green-500/10 text-green-400 border-green-500/20"
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">
                              {user.date}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  handleRevoke(user.id, user.is_invite)
                                }
                                className="p-2 bg-white/[0.03] hover:bg-red-950/30 border border-white/5 hover:border-red-500/20 rounded-xl text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                                title={
                                  user.is_invite
                                    ? "Cancel Invitation"
                                    : "Revoke Access"
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default UserManagement;

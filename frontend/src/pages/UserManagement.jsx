import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Trash2, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DeveloperNavbar from "../components/AdminNavbar";

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
    if (!token) return navigate("/login");

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

      // 2. Fetch GitHub Integration Status
      const statusRes = await fetch(`${API_URL}/api/github/status`, { headers });
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
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevoke = async (id, isInvite) => {
    if (!window.confirm("Are you sure you want to remove this user?")) return;
    try {
      const res = await fetch(`${API_URL}/api/invite/revoke/${id}?is_invite=${isInvite}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          admin={admin} 
          isConnected={isConnected} 
          isOpen={isSidebarOpen} 
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Access Management / Users</h2>
          </header>

          <main className="flex-1 p-10 overflow-y-auto bg-[#010203]">
            <div className="max-w-6xl mx-auto space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                  />
                </div>
                <button
                  onClick={() => navigate("/invite-users")}
                  className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Invite Developer
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-white/5 rounded-xl bg-black/20">
                  <User className="w-12 h-12 mb-4 opacity-20" />
                  <p>No developers or invitations found.</p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                        <th className="px-6 py-4 font-medium">User</th>
                        <th className="px-6 py-4 font-medium">Repositories</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Joined / Sent</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-sm">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-200">{user.name}</div>
                            <div className="text-gray-500 text-xs mt-1">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {user.repo_count} {user.repo_count === 1 ? 'Repository' : 'Repositories'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.is_invite 
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {user.date}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRevoke(user.id, user.is_invite)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title={user.is_invite ? "Cancel Invitation" : "Revoke Access"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;

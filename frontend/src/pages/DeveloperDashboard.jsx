import React, { useEffect, useState, useCallback } from "react";
import { Bell, LayoutDashboard, Folder, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DeveloperDashboard = () => {
  const [user, setUser] = useState({ id: null, first_name: "", last_name: "", email: "" });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchRepos = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.map(r => ({
          id: r.repo_id,
          name: r.repo_name,
          fullName: r.full_name,
          url: r.html_url,
        })));
      }
    } catch (err) {
      console.error(err);
    }
  }, [API_URL]);

// DeveloperDashboard.jsx

useEffect(() => {
  const initDashboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      // 1. Fetch User Info first to get the ID
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Auth failed");
      const userData = await res.json();
      setUser(userData);

      // 2. Handle Pending Invite ONLY IF we have a token and user ID
      const pendingToken = localStorage.getItem("pendingInviteToken");
      if (pendingToken && userData.id) {
        const acceptRes = await fetch(`${API_URL}/api/invite/accept/${pendingToken}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_id: parseInt(userData.id, 10) }),
        });

        if (acceptRes.ok) {
          console.log("Invite accepted successfully!");
          localStorage.removeItem("pendingInviteToken");
          // Small delay or explicit wait to ensure DB consistency
        } else {
          const errorData = await acceptRes.json();
          console.error("Invite Accept Failed:", errorData.detail);
        }
      }

      // 3. Fetch Repos ONLY AFTER the invite logic is completed
      await fetchRepos();
      
    } catch (err) {
      console.error("Dashboard Init Error:", err);
    } finally {
      setLoading(false);
    }
  };

  initDashboard();
}, [API_URL, fetchRepos]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black to-cyan-900 text-white">
      <aside className="w-72 bg-black/40 border-r border-white/10 p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-xl">
              {user.first_name?.[0]}
            </div>
            <div>
              <p className="font-semibold">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-400 truncate w-40">{user.email}</p>
            </div>
          </div>
          <nav className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-cyan-600/20 rounded-lg text-cyan-400 cursor-pointer">
              <LayoutDashboard size={20}/> Dashboard
            </div>
            <div className="flex items-center gap-3 p-3 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer">
              <Folder size={20}/> Projects
            </div>
          </nav>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.href="/login"; }} className="flex items-center gap-3 text-gray-500 hover:text-red-400 p-3">
          <LogOut size={20}/> Logout
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-4">Workspace</h1>
        <p className="text-gray-400 mb-8">{projects.length} Active Repositories</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-white/10">
                <th className="px-6 py-4 font-semibold">PROJECT NAME</th>
                <th className="px-6 py-4 font-semibold">REPOSITORY PATH</th>
                <th className="px-6 py-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm font-mono">{p.fullName}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => window.open(p.url, "_blank")} className="px-4 py-2 bg-cyan-600/10 text-cyan-400 border border-cyan-600/20 rounded-lg text-sm hover:bg-cyan-600 hover:text-white transition-all">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Folder size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">Workspace Empty</h3>
              <p className="text-gray-500 max-w-sm mt-2">Check your email for invitations to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DeveloperDashboard;

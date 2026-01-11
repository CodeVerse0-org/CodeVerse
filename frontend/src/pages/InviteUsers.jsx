import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { RefreshCcw, Github } from "lucide-react";

const InviteUsers = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]); // ✅ Selected repos
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Admin info (can later be fetched dynamically)
  const admin = {
    name: "GitHub Admin",
    email: "developer@gmail.com",
  };

  // Fetch GitHub connection & repositories
  useEffect(() => {
    const fetchRepos = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      const headers = { Authorization: `Bearer ${token}` };

      try {
        // Check GitHub connection
        const statusRes = await fetch(`${API_URL}/api/github/status`, { headers });
        if (!statusRes.ok) throw new Error("Status check failed");

        const statusData = await statusRes.json();
        setIsConnected(statusData.connected);

        if (statusData.connected) {
          // Fetch repos
          const repoRes = await fetch(`${API_URL}/api/github/repositories`, { headers });
          if (!repoRes.ok) throw new Error("Repo fetch failed");

          const repoData = await repoRes.json();
          setRepos(repoData.repositories || []);
        }
      } catch (err) {
        console.error("Invite repo fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [navigate, API_URL]);

  // ✅ Toggle repo selection
  const toggleRepo = (id) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // ✅ Send invite API call
  const sendInvite = async () => {
    if (!email) return alert("Please enter an email.");
    if (selectedRepos.length === 0) return alert("Please select at least one repository.");

    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    try {
      const res = await fetch(`${API_URL}/api/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          repo_ids: selectedRepos,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send invite");

      alert("Invitation sent successfully!");
      // Reset form
      setEmail("");
      setRole("Developer");
      setSelectedRepos([]);
    } catch (err) {
      console.error("Send invite error:", err);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black via-[#041a1f] to-black text-white">
      <Sidebar admin={admin} isConnected={isConnected} />

      <main className="flex-1 p-8">
        <h1 className="text-xl font-bold mb-1">Invite User & Access</h1>
        <p className="text-gray-500 text-sm mb-6">
          Send an email invitation and assign initial access rights.
        </p>

        {/* User Info */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold mb-4">User Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm"
            >
              <option>Developer</option>
              <option>Admin</option>
              <option>Viewer</option>
            </select>
          </div>
        </div>

        {/* Assign Repositories */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold mb-4">Assign Repositories</h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCcw className="animate-spin text-cyan-500" size={32} />
            </div>
          ) : !isConnected ? (
            <div className="text-center py-10 text-gray-400">
              <Github size={40} className="mx-auto mb-3" />
              <p>GitHub is not connected.</p>
            </div>
          ) : repos.length === 0 ? (
            <p className="text-gray-500">No repositories available.</p>
          ) : (
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400">
                  <tr>
                    <th className="p-3 text-left">Repository Name</th>
                    <th className="p-3 text-right">Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo) => (
                    <tr
                      key={repo.id}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="p-3 flex items-center gap-2">
                        {/* ✅ Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedRepos.includes(repo.id)}
                          onChange={() => toggleRepo(repo.id)}
                        />
                        {repo.name}
                      </td>
                      <td className="p-3 text-right text-gray-400">
                        {repo.private ? "Private" : "Public"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <button
              className="px-6 py-2 rounded-xl border border-white/10 text-sm"
              onClick={() => {
                setEmail("");
                setRole("Developer");
                setSelectedRepos([]);
              }}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 rounded-xl bg-cyan-600 text-black font-bold text-sm hover:bg-cyan-500"
              onClick={sendInvite} // ✅ Send invite
            >
              Send Invitation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InviteUsers;

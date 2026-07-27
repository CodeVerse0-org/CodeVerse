import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Github,
  UserPlus,
  Mail,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Lock,
  Globe,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import AdminNavbar from "../components/AdminNavbar";

const InviteUsers = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [admin, setAdmin] = useState({ name: "", email: "" });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const navigate = useNavigate();

  // Keep http:// when testing locally on localhost, enforce https:// in production
  const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const API_URL = rawApiUrl.includes("localhost") 
    ? rawApiUrl 
    : rawApiUrl.replace(/^http:\/\//i, "https://");

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
      const [statusRes, adminRes] = await Promise.all([
        fetch(`${API_URL}/api/github/status`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers }),
      ]);

      if (adminRes.ok) {
        const adminData = await adminRes.json();
        setAdmin({
          name:
            `${adminData.first_name || ""} ${adminData.last_name || ""}`.trim() ||
            "Admin",
          email: adminData.email || "",
        });
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const connected = Boolean(statusData.connected);
        setIsConnected(connected);

        if (connected) {
          const repoRes = await fetch(`${API_URL}/api/github/repositories`, {
            headers,
          });
          if (repoRes.ok) {
            const repoData = await repoRes.json();
            if (Array.isArray(repoData)) {
              setRepos(repoData);
            } else if (Array.isArray(repoData?.repositories)) {
              setRepos(repoData.repositories);
            } else {
              setRepos([]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Invite page fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRepo = (id) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const sendInvite = async () => {
    if (!email) return alert("Please enter an email.");
    if (selectedRepos.length === 0)
      return alert("Please select at least one repository.");

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/invite/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, repo_ids: selectedRepos }),
      });

      if (res.ok) {
        alert("Invitation sent successfully!");
        setEmail("");
        setSelectedRepos([]);
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail || "Failed to send invitation."}`);
      }
    } catch (err) {
      alert("Failed to send invite. Check console for details.");
      console.error(err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
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
            <div className="max-w-5xl w-full mx-auto space-y-6">
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
                    INVITE DEVELOPER{" "}
                    <UserPlus className="text-cyan-500" size={24} />
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Developer Details Card */}
                <div className="bg-[#05070a] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 pb-3 border-b border-white/5">
                    <Mail size={16} />
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      Developer Identity
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="developer@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500/50 transition-all font-mono text-white placeholder:text-gray-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                        Access Level
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500/50 appearance-none text-white font-mono font-bold cursor-pointer"
                      >
                        <option className="bg-[#020405]">Developer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Repositories Selection Card */}
                <div className="bg-[#05070a] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <ShieldCheck size={16} />
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Target Repositories
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-lg uppercase text-cyan-400">
                      {selectedRepos.length} Selected
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                      <Loader2
                        className="animate-spin text-cyan-500"
                        size={36}
                      />
                      <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-500/80 font-mono font-bold">
                        Querying Repository Inventory...
                      </span>
                    </div>
                  ) : !isConnected ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/5 rounded-xl bg-black/20">
                      <Github size={40} className="text-red-400 mb-3" />
                      <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-1">
                        GitHub Integration Offline
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Authorize your workspace integration on the dashboard to
                        assign codebases.
                      </p>
                    </div>
                  ) : repos.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-white/5 rounded-xl bg-black/20">
                      <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                        No Repositories Available
                      </p>
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/40">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                          <tr>
                            <th className="p-4 text-[10px] font-mono font-bold uppercase text-gray-400 tracking-widest">
                              Repository Name
                            </th>
                            <th className="p-4 text-[10px] font-mono font-bold uppercase text-gray-400 tracking-widest text-right">
                              Visibility
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-mono">
                          {repos.map((repo, index) => {
                            const isSelected = selectedRepos.includes(repo.id);
                            return (
                              <tr
                                key={`${repo.id}-${repo.name || index}`}
                                onClick={() => toggleRepo(repo.id)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-cyan-500/10"
                                    : "hover:bg-white/[0.02]"
                                }`}
                              >
                                <td className="p-4 flex items-center gap-3">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "bg-cyan-500 border-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                                        : "border-white/20 bg-transparent"
                                    }`}
                                  >
                                    {isSelected && <CheckCircle2 size={12} />}
                                  </div>
                                  <span
                                    className={`font-bold ${
                                      isSelected
                                        ? "text-cyan-400"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    {repo.name}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-white/[0.02] border-white/5 text-gray-400">
                                    {repo.private ? (
                                      <Lock size={10} />
                                    ) : (
                                      <Globe size={10} />
                                    )}
                                    {repo.private ? "Private" : "Public"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      disabled={!email || selectedRepos.length === 0}
                      onClick={sendInvite}
                      className="px-6 py-3 rounded-xl bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-950/40 cursor-pointer"
                    >
                      Authorize & Send Invitation
                    </button>
                  </div>
                </div>
              </div>
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

export default InviteUsers;
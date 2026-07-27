import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch,
  Lock,
  Globe,
  ExternalLink,
  RefreshCcw,
  Search,
  Database,
  Github,
  Loader2,
  Cpu,
  ArrowUpRight,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import AdminNavbar from "../components/AdminNavbar";

const Repositories = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [admin, setAdmin] = useState({ name: "", email: "" });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const navigate = useNavigate();
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
      const [statusRes, adminRes] = await Promise.all([
        fetch(`${API_URL}/api/github/status`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers }),
      ]);

      if (statusRes.ok && adminRes.ok) {
        const statusData = await statusRes.json();
        const adminData = await adminRes.json();

        setIsConnected(!!statusData.connected);
        setAdmin({
          name:
            `${adminData.first_name || ""} ${adminData.last_name || ""}`.trim() ||
            adminData.email,
          email: adminData.email,
        });

        if (statusData.connected) {
          const repoRes = await fetch(`${API_URL}/api/github/repositories`, {
            headers,
          });
          if (repoRes.ok) {
            const repoData = await repoRes.json();
            setRepos(repoData.repositories || []);
          }
        }
      }
    } catch (err) {
      console.error("Repository Telemetry Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
            <div className="max-w-[1600px] w-full mx-auto space-y-8">
              {/* Header Banner */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                      Inventory Management
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    REPOSITORIES DIRECTORY{" "}
                    <Database className="text-cyan-500" size={24} />
                  </h1>
                </div>

                {/* Search & Refresh Toolbar */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-80">
                    <Search
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Filter repositories..."
                      value={searchTerm}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 transition-all font-mono text-white placeholder:text-gray-600"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={fetchData}
                    title="Refresh Repositories"
                    className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl text-gray-400 hover:text-cyan-400 transition-all cursor-pointer"
                  >
                    <RefreshCcw
                      size={16}
                      className={loading ? "animate-spin text-cyan-400" : ""}
                    />
                  </button>
                </div>
              </div>

              {/* Conditional Content Matrix */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-3">
                  <Loader2 className="animate-spin text-cyan-500" size={36} />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-500/80 font-mono font-bold">
                    Indexing Remote Repositories...
                  </span>
                </div>
              ) : !isConnected ? (
                <div className="flex flex-col items-center justify-center py-24 bg-[#05070a] border border-white/5 rounded-2xl shadow-xl text-center px-4">
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
                    <Github size={36} />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2 tracking-tight">
                    VCS PIPELINE DISCONNECTED
                  </h2>
                  <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
                    GitHub organization webhooks are unlinked. Authorize your
                    workspace to visualize codebases and dependency structures.
                  </p>
                  <button
                    onClick={() => navigate("/adminDashboard")}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-950/40 cursor-pointer"
                  >
                    Authorize GitHub Integration
                  </button>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-[#05070a] border border-white/5 rounded-2xl text-center">
                  <Cpu className="text-gray-600 mb-3" size={32} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    No Repositories Found
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your search filters or check your repository
                    permissions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="group bg-[#05070a] border border-white/5 hover:border-cyan-500/30 p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between shadow-lg relative overflow-hidden"
                    >
                      {/* Top Accent Line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/20 group-hover:via-cyan-400 transition-all opacity-0 group-hover:opacity-100" />

                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                            <GitBranch size={18} />
                          </div>
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${repo.private ? "bg-white/[0.02] border-white/5 text-gray-400" : "bg-green-500/10 border-green-500/20 text-green-400"}`}
                          >
                            {repo.private ? (
                              <Lock size={10} />
                            ) : (
                              <Globe size={10} />
                            )}
                            {repo.private ? "Private" : "Public"}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white mb-2 truncate group-hover:text-cyan-400 transition-colors">
                          {repo.name}
                        </h3>
                        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-4">
                          {repo.description ||
                            "No description provided for this codebase."}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <span className="text-[11px] font-mono font-bold text-cyan-400/80 uppercase tracking-wider">
                          {repo.language || "Universal"}
                        </span>
                        {repo.html_url && (
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            title="View on GitHub"
                            className="p-2 bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 rounded-xl text-gray-400 hover:text-cyan-400 transition-all flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider"
                          >
                            <span>Source</span>
                            <ArrowUpRight size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
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

export default Repositories;

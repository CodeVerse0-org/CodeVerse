// ChatbotRepoSelectionPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Search,
  Github,
  ChevronRight,
  Cpu,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const ChatbotRepoSelectionPage = () => {
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [user, setUser] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
        } else if (
          data &&
          typeof data === "object" &&
          Array.isArray(data.repos)
        ) {
          setProjects(data.repos);
        } else {
          setProjects([]);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProjects = (projects || []).filter((p) => {
    const name = p.full_name || p.name || "";
    return name.toLowerCase().includes(filterQuery.toLowerCase());
  });

  const handleSelectRepo = (repo) => {
    const repoPath = repo.full_name || repo.name;
    navigate(
      `/chatbot?repo=${encodeURIComponent(repoPath)}&inst=${repo.installation_id || ""}`,
    );
  };

  return (
    <div className="h-screen flex flex-col bg-black text-gray-300 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar
          user={user}
          isOpen={isSidebarOpen}
          loading={loading}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
          {/* Header Banner */}
          <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black justify-between z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <Cpu size={16} />
              </div>
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-wider text-white">
                  AI Repository Selection
                </h2>
                <p className="text-[13px] text-gray-500 font-mono">
                  Select a target repository for AI code sessions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-gray-500">
                Available:
              </span>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {filteredProjects.length}
              </span>
            </div>
          </header>

          <main className="flex-1 p-6 flex flex-col overflow-hidden bg-black">
            {/* Search Bar Block */}
            <div className="relative mb-6 shrink-0">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Search connected repository name..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
              />
            </div>

            {/* Repositories Grid Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-32 bg-white/[0.02] animate-pulse rounded-2xl border border-white/5"
                    />
                  ))}
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                  {filteredProjects.map((repo, idx) => {
                    const displayName =
                      repo.full_name || repo.name || "Unknown Repo";
                    const owner = displayName.includes("/")
                      ? displayName.split("/")[0]
                      : "User";
                    const project = displayName.includes("/")
                      ? displayName.split("/")[1]
                      : displayName;

                    return (
                      <div
                        key={repo.id || idx}
                        onClick={() => handleSelectRepo(repo)}
                        className="group relative bg-black border border-white/10 p-5 rounded-2xl cursor-pointer hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-xl"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 group-hover:border-cyan-400 transition-all">
                              <Box size={16} />
                            </div>
                            <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              <span className="text-[9px] font-mono uppercase text-gray-400 font-bold">
                                Ready
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 mb-4">
                            <h3 className="text-xs font-bold text-white tracking-tight truncate block group-hover:text-cyan-400 transition-colors">
                              {project}
                            </h3>
                            <div className="flex items-center gap-1.5">
                              <Github size={12} className="text-gray-600" />
                              <p className="text-[10px] font-mono text-gray-500 truncate">
                                {owner}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                            Start Session
                          </span>
                          <ChevronRight
                            size={14}
                            className="text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <AlertCircle size={32} className="text-gray-600" />
                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500">
                    No repositories found in registry
                  </p>
                  <button
                    onClick={fetchData}
                    className="text-[10px] font-mono text-cyan-400 underline uppercase tracking-wider cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ChatbotRepoSelectionPage;

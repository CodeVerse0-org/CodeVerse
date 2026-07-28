// RepoSelectionPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Github,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FolderCode,
  Search,
  Loader2,
  Terminal,
} from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const RepoSelectionPage = () => {
  const navigate = useNavigate();

  // =========================
  // STATES
  // =========================
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [installationId, setInstallationId] = useState(null);
  const [user, setUser] = useState(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [generatingGraphs, setGeneratingGraphs] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // =========================
  // SIDEBAR & DATA FETCHING
  // =========================
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const fetchData = useCallback(async () => {
    setLoadingProjects(true);
    const token = localStorage.getItem("token");
    try {
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        setUser(await userRes.json());
      }

      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================
  // ACTIONS
  // =========================
  const filteredProjects = projects.filter((p) =>
    p.full_name.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  const handleRepoClick = (repo) => {
    setSelectedRepo(repo.full_name);
    setInstallationId(repo.installation_id);
  };

  const handleProcess = async () => {
    if (!selectedRepo) return;
    const token = localStorage.getItem("token");
    const inst = installationId || 0;

    // Clear old session to prevent mixing
    sessionStorage.clear();
    
    try {
      setGeneratingGraphs(true);

      const endpoint = `${API_URL}/api/repos/generate-all-graphs?full_repo=${encodeURIComponent(selectedRepo)}&installation_id=${inst}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Graph generation failed");
      }

      // CRITICAL: Ensure data exists before navigating
      if (data.file_graph && data.function_graph) {
        sessionStorage.setItem("file_graph", JSON.stringify(data.file_graph));
        sessionStorage.setItem(
          "function_graph",
          JSON.stringify(data.function_graph),
        );
        sessionStorage.setItem(
          "state_graph",
          JSON.stringify(data.state_graph || { nodes: [], links: [] }),
        );
        sessionStorage.setItem(
          "api_graph",
          JSON.stringify(data.api_graph || data.api_graphs || { nodes: [], links: [] }),
        );

        console.log("Analysis Complete. Ready for Visualization.");

        // Navigation after a tiny delay for storage safety
        setTimeout(() => {
          navigate(
            `/visualization?repo=${encodeURIComponent(selectedRepo)}&inst=${inst}`,
          );
        }, 300);
      } else {
        throw new Error("Received incomplete data from server.");
      }
    } catch (err) {
      console.error("PROCESS ERROR:", err);
      alert(err.message);
    } finally {
      setGeneratingGraphs(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black text-gray-300 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* LOADING OVERLAY */}
      {generatingGraphs && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative">
            <Loader2
              size={40}
              className="text-cyan-400 animate-spin relative z-10"
            />
          </div>
          <h2 className="mt-6 text-white font-bold tracking-wider uppercase text-sm">
            Architecting Visuals...
          </h2>
          <p className="text-gray-500 text-[11px] font-mono mt-1">
            Mapping target codebase: {selectedRepo}
          </p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
      `}</style>

      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar
          user={user}
          isOpen={isSidebarOpen}
          loading={loadingProjects}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
          {/* Header Banner */}
          <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black justify-between z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <Github size={16} />
              </div>
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white">
                  Repository Browser
                </h2>
                <p className="text-[12px] text-gray-500 font-mono">
                  Select a target codebase for architectural mapping
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

          <main className="flex-1 p-6 flex gap-6 overflow-hidden bg-black">
            {/* Repository List Section */}
            <div className="w-[380px] flex flex-col border border-white/10 rounded-2xl bg-black overflow-hidden shadow-xl shrink-0">
              <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2.5">
                <Search size={14} className="text-gray-500 ml-1" />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-600 focus:outline-none font-mono"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loadingProjects ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-16 w-full bg-white/[0.02] rounded-xl border border-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="flex flex-col divide-y divide-white/5">
                    {filteredProjects.map((repo) => (
                      <div
                        key={repo.full_name}
                        onClick={() => handleRepoClick(repo)}
                        className={`group relative p-4 flex items-center gap-3.5 cursor-pointer transition-all ${
                          selectedRepo === repo.full_name
                            ? "bg-cyan-500/10 border-l-2 border-cyan-400"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            selectedRepo === repo.full_name
                              ? "bg-cyan-500 text-black border-cyan-400"
                              : "bg-white/[0.02] text-gray-400 border-white/5 group-hover:border-white/10"
                          }`}
                        >
                          <FolderCode size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-xs font-bold truncate ${selectedRepo === repo.full_name ? "text-white" : "text-gray-300"}`}
                          >
                            {repo.full_name.split("/")[1]}
                          </h3>
                          <p className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                            {repo.full_name}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {repo.installation_id ? (
                            <ShieldCheck
                              size={14}
                              className={
                                selectedRepo === repo.full_name
                                  ? "text-cyan-400"
                                  : "text-emerald-500/60"
                              }
                            />
                          ) : (
                            <AlertCircle
                              size={14}
                              className="text-rose-500/60"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-600 text-xs font-mono uppercase tracking-wider">
                      No repositories found
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action / Preview Container */}
            <div className="flex-1 flex flex-col items-center justify-center border border-white/10 rounded-2xl bg-black p-10 relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
                {/* Central Icon Representation */}
                <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative">
                  <div
                    className={`absolute inset-0 rounded-2xl transition-all duration-300 ${selectedRepo ? "bg-cyan-500/10 border border-cyan-500/30" : ""}`}
                  />
                  <Network
                    size={32}
                    className={
                      selectedRepo
                        ? "text-cyan-400 relative z-10"
                        : "text-gray-600 relative z-10"
                    }
                  />
                </div>

                {/* Status Text */}
                <div className="text-center space-y-1.5 mb-8">
                  <h1 className="text-base font-bold text-white tracking-tight">
                    {selectedRepo ? selectedRepo : "Target Unselected"}
                  </h1>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                    {selectedRepo
                      ? "Ready for AST graph compilation & dependency flow mapping"
                      : "Select a repository from the left panel to begin mapping"}
                  </p>
                </div>

                {/* Submit Action Button */}
                <button
                  onClick={handleProcess}
                  disabled={!selectedRepo || generatingGraphs}
                  className="w-full py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {generatingGraphs ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Compiling Analysis...</span>
                    </>
                  ) : (
                    <>
                      <span>Initialize Analysis</span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  )}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RepoSelectionPage;
// HistoryPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  ChevronDown,
  Database,
  Globe,
  FolderTree,
  Loader2,
  Clock,
  ExternalLink,
  FileText,
  Zap,
  ShieldCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";

const HistoryPage = () => {
  const navigate = useNavigate();

  // =========================
  // STATES
  // =========================
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [activeTab, setActiveTab] = useState("graphs");
  const [historyData, setHistoryData] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Fetch user profile info for sidebar
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        setUser(await userRes.json());
      }

      const endpoint =
        activeTab === "summaries"
          ? "/api/repos/summary-history"
          : "/api/repos/history";

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.warn(`API returned status ${res.status} for ${endpoint}`);
        setHistoryData([]);
        return;
      }

      const data = await res.json();
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History fetch failed:", err);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, activeTab, navigate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleLaunchVisualization = (item) => {
    const fullRepo = item.repo_name || "";
    const [owner, repo] = fullRepo.split("/");
    if (!owner || !repo) return;

    const params = new URLSearchParams({
      timestamp: item.timestamp,
      graph_type: item.graph_type || "file",
      history: "true",
    });

    navigate(`/visualization/${owner}/${repo}?${params.toString()}`);
  };

  /**
   * Enhanced Date Formatter
   * Handles ISO strings, timestamps, and missing data fallbacks
   */
  const formatDate = (dateValue) => {
    if (!dateValue) return "Timestamp Pending";

    let safeValue = dateValue;
    if (
      typeof dateValue === "string" &&
      !dateValue.endsWith("Z") &&
      !dateValue.includes("+")
    ) {
      safeValue = `${dateValue.replace(" ", "T")}Z`;
    }

    const dateObj = new Date(safeValue);

    if (isNaN(dateObj.getTime())) {
      return "Recent Log";
    }

    return dateObj.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSidebarNodes = () => {
    const repos = {};
    historyData.forEach((item) => {
      const repoName = item.repo_name || "Unknown Repository";
      if (!repos[repoName]) {
        repos[repoName] = { frontend: [], backend: [], other: [] };
      }

      const path = (item.path || "").toLowerCase();
      if (path.includes("frontend")) repos[repoName].frontend.push(item);
      else if (path.includes("backend")) repos[repoName].backend.push(item);
      else repos[repoName].other.push(item);
    });
    return repos;
  };

  const sidebarNodes = getSidebarNodes();

  return (
    <div className="h-screen flex flex-col bg-black text-gray-300 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.5); }
        
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .latest-indicator { animation: subtle-pulse 2s infinite ease-in-out; }
      `}</style>

      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar
          user={user}
          isOpen={isSidebarOpen}
          loading={loading}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative bg-black">
          {/* Header Banner */}
          <header className="h-20 border-b border-white/5 flex items-center px-8 bg-black justify-between z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-wider text-white">
                  History
                </h2>
                <p className="text-[12px] text-gray-500 font-mono">
                  Temporal code base archives & historical snapshots
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab("graphs");
                  setSelectedItem(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "graphs"
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                    : "bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.05]"
                }`}
              >
                Graph Snapshots
              </button>
              <button
                onClick={() => {
                  setActiveTab("summaries");
                  setSelectedItem(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "summaries"
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                    : "bg-white/[0.02] text-gray-400 border border-white/5 hover:bg-white/[0.05]"
                }`}
              >
                Code Summaries
              </button>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Node Explorer */}
            <div className="w-80 border-r border-white/5 overflow-y-auto p-4 bg-black custom-scrollbar shrink-0">
              <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4 px-2">
                Node Explorer
              </h3>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2
                    className="animate-spin text-cyan-400 mb-2"
                    size={24}
                  />
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Accessing Neo4j...
                  </p>
                </div>
              ) : Object.keys(sidebarNodes).length > 0 ? (
                <div className="space-y-3">
                  {Object.keys(sidebarNodes).map((repo) => (
                    <div
                      key={repo}
                      className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden"
                    >
                      <div
                        onClick={() =>
                          setExpanded((p) => ({ ...p, [repo]: !p[repo] }))
                        }
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Folder
                            size={14}
                            className="text-cyan-400 shrink-0"
                          />
                          <span className="text-xs font-bold text-white truncate">
                            {repo}
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`text-gray-500 transition-transform ${!expanded[repo] && "-rotate-90"}`}
                        />
                      </div>

                      {expanded[repo] && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
                          {["frontend", "backend", "other"].map(
                            (sub) =>
                              sidebarNodes[repo][sub].length > 0 && (
                                <div key={sub}>
                                  <div className="text-[9px] font-mono uppercase text-gray-500 mb-1.5 flex items-center gap-1.5">
                                    <FolderTree size={10} /> {sub}
                                  </div>
                                  <div className="space-y-1">
                                    {sidebarNodes[repo][sub].map(
                                      (item, idx) => (
                                        <div
                                          key={idx}
                                          onClick={() => setSelectedItem(item)}
                                          className={`group p-2.5 cursor-pointer rounded-xl transition-all border ${
                                            selectedItem === item
                                              ? "bg-cyan-500/10 border-cyan-500/30 text-white"
                                              : "border-white/5 bg-black hover:bg-white/[0.02] text-gray-400"
                                          }`}
                                        >
                                          <div className="flex justify-between items-center mb-1">
                                            <div className="truncate text-xs font-bold flex items-center gap-2">
                                              {activeTab === "summaries" ? (
                                                <FileText
                                                  size={12}
                                                  className="text-cyan-400"
                                                />
                                              ) : (
                                                <Database
                                                  size={12}
                                                  className="text-cyan-400"
                                                />
                                              )}
                                              <span className="truncate">
                                                {activeTab === "summaries"
                                                  ? item.filename || "Module"
                                                  : "SNAPSHOT"}
                                              </span>
                                            </div>
                                            {idx === 0 && (
                                              <span className="latest-indicator bg-cyan-500/10 text-cyan-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase font-bold">
                                                Latest
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                                            <Clock size={10} />{" "}
                                            {formatDate(item.timestamp)}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              ),
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-600">
                  <Database size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-[10px] font-mono uppercase tracking-wider">
                    No Logs Found
                  </p>
                </div>
              )}
            </div>

            {/* Main Content Detail Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-black custom-scrollbar">
              {selectedItem ? (
                activeTab === "summaries" ? (
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        {selectedItem.filename}
                      </h2>
                      <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-wider mt-1">
                        {selectedItem.path}
                      </p>
                    </div>

                    <div className="relative border border-white/10 rounded-2xl bg-black p-6 shadow-xl">
                      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Zap size={14} />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            AI Analysis
                          </h4>
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5">
                          Generated:{" "}
                          <span className="text-gray-300 ml-1">
                            {formatDate(selectedItem.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="prose prose-invert max-w-none text-gray-300 text-xs leading-relaxed font-sans">
                        <ReactMarkdown>
                          {selectedItem.summary ||
                            "This node has no descriptive intelligence logged."}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="border border-white/10 rounded-2xl bg-black p-8 text-center shadow-xl max-w-sm w-full">
                      <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 text-cyan-400">
                        <Globe size={22} />
                      </div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-tight">
                        Structural Mapping
                      </h2>
                      <p className="text-gray-500 text-[10px] font-mono mt-1 mb-6">
                        Captured: {formatDate(selectedItem.timestamp)}
                      </p>
                      <button
                        onClick={() => handleLaunchVisualization(selectedItem)}
                        className="w-full py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer group"
                      >
                        <ExternalLink
                          size={14}
                          className="group-hover:scale-110 transition-transform"
                        />
                        <span>Reconstruct Mapping</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2">
                  <Database size={40} className="text-gray-800" />
                  <p className="text-xs font-mono uppercase tracking-wider">
                    Vault Standby — Select a Node
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;

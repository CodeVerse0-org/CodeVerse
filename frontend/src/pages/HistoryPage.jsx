import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Folder, ChevronDown, Database, Globe, FolderTree, 
  Loader2, Clock, ExternalLink, FileText, Zap 
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import DeveloperNavbar from "../components/DeveloperNavbar";
import DeveloperSidebar from "../components/DeveloperSidebar";

const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState("graphs"); 
  const [historyData, setHistoryData] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// HistoryPage.jsx

useEffect(() => {
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const endpoint = activeTab === "summaries" 
        ? "/api/repos/summary-history" 
        : "/api/repos/history";
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
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
  };

  fetchHistory();
}, [API_URL, activeTab, navigate]);

  const handleLaunchVisualization = (item) => {
    const fullRepo = item.repo_name || "";
    const [owner, repo] = fullRepo.split("/");
    if (!owner || !repo) return;

    const params = new URLSearchParams({
      timestamp: item.timestamp,
      graph_type: item.graph_type || "file",
      history: "true"
    });

    navigate(`/visualization/${owner}/${repo}?${params.toString()}`);
  };

  /**
   * Enhanced Date Formatter
   * Handles ISO strings, timestamps, and missing data fallbacks
   */
  const formatDate = (dateValue) => {
    if (!dateValue) return "Timestamp Pending";
    
    // Robust date parsing
    const dateObj = new Date(dateValue);
    
    if (isNaN(dateObj.getTime())) {
      return "Recent Log";
    }

    return dateObj.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSidebarNodes = () => {
    const repos = {};
    historyData.forEach(item => {
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
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
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

      <DeveloperNavbar />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={true} />
        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 bg-black/40 border-b border-white/5 backdrop-blur-md z-10">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-lg">
                    <Clock className="text-cyan-400" size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Intelligence Vault</h1>
                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-[0.4em]">Temporal Codebase Archives</p>
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                  onClick={() => { setActiveTab("graphs"); setSelectedItem(null); }}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === "graphs" 
                    ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" 
                    : "bg-white/5 text-gray-500 hover:text-white"
                  }`}
                >
                  Graph Snapshots
                </button>
                <button 
                  onClick={() => { setActiveTab("summaries"); setSelectedItem(null); }}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === "summaries" 
                    ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]" 
                    : "bg-white/5 text-gray-500 hover:text-white"
                  }`}
                >
                  Code Summaries
                </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar List */}
            <div className="w-85 border-r border-white/5 overflow-y-auto p-6 bg-black/10 custom-scrollbar">
              <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-8">Node Explorer</h3>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-40">
                  <Loader2 className="animate-spin text-cyan-500 mb-4" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Accessing Neo4j...</p>
                </div>
              ) : Object.keys(sidebarNodes).length > 0 ? (
                Object.keys(sidebarNodes).map(repo => (
                  <div key={repo} className="mb-6">
                    <div 
                      onClick={() => setExpanded(p => ({...p, [repo]: !p[repo]}))}
                      className="flex items-center gap-3 cursor-pointer group mb-3"
                    >
                      <ChevronDown size={14} className={`text-gray-600 transition-transform ${!expanded[repo] && '-rotate-90'}`} />
                      <Folder size={18} className="text-cyan-500/80 group-hover:text-cyan-400" /> 
                      <span className="text-white font-black text-[11px] uppercase tracking-wider">{repo}</span>
                    </div>

                    {expanded[repo] && (
                      <div className="ml-5 border-l border-white/10 pl-4 space-y-6">
                        {["frontend", "backend", "other"].map(sub => (
                          sidebarNodes[repo][sub].length > 0 && (
                            <div key={sub}>
                              <div className="text-[8px] font-black uppercase text-gray-600 mb-3 flex items-center gap-2">
                                <FolderTree size={10}/> {sub}
                              </div>
                              <div className="space-y-1">
                                {sidebarNodes[repo][sub].map((item, idx) => (
                                  <div 
                                    key={idx}
                                    onClick={() => setSelectedItem(item)}
                                    className={`group p-3 cursor-pointer rounded-xl transition-all border ${
                                      selectedItem === item 
                                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" 
                                      : "border-transparent hover:bg-white/5 text-gray-500"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <div className="truncate font-black text-[10px] uppercase tracking-tight flex items-center gap-2">
                                        {activeTab === "summaries" ? <FileText size={12}/> : <Database size={12}/>}
                                        {activeTab === "summaries" ? (item.filename || "Module") : "SNAPSHOT"}
                                      </div>
                                      {/* Highlight Latest */}
                                      {idx === 0 && (
                                        <div className="latest-indicator bg-cyan-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded uppercase italic">
                                          Latest
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[8px] font-bold opacity-40 group-hover:opacity-100 transition-opacity">
                                      <Clock size={10} /> {formatDate(item.timestamp)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-20 flex flex-col items-center">
                  <Database size={30} className="mb-4" />
                  <p className="text-[9px] font-black uppercase tracking-widest">No Logs Found</p>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-12 overflow-y-auto bg-[#020405] custom-scrollbar">
              {selectedItem ? (
                activeTab === "summaries" ? (
                  <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <h2 className="text-5xl font-black text-white tracking-tighter italic leading-none">{selectedItem.filename}</h2>
                    <p className="text-cyan-500/60 font-mono text-[9px] uppercase tracking-[0.4em] mt-3 mb-12">{selectedItem.path}</p>
                    
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative p-12 bg-[#080a0c] border border-white/10 rounded-[2.5rem] shadow-2xl">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.5em] flex items-center gap-2">
                                    <Zap size={14} fill="currentColor" /> AI Analysis
                                </h4>
                                <div className="text-[8px] font-black text-gray-500 uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                    Generated At: <span className="text-gray-300 ml-1">{formatDate(selectedItem.timestamp)}</span>
                                </div>
                            </div>
                            <div className="prose prose-invert max-w-none text-gray-300 prose-p:text-sm prose-p:leading-relaxed prose-strong:text-cyan-400 prose-code:text-cyan-200">
                                <ReactMarkdown>{selectedItem.summary || "This node has no descriptive intelligence logged."}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="p-12 bg-white/5 border border-white/10 rounded-[3rem] text-center shadow-2xl max-w-sm w-full animate-in zoom-in-95">
                      <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                        <Globe size={44} className="text-cyan-500" />
                      </div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Structural Mapping</h2>
                      <p className="text-gray-500 text-[10px] font-bold mt-4 mb-10 uppercase tracking-widest">
                        Captured: {formatDate(selectedItem.timestamp)}
                      </p>
                      <button 
                        onClick={() => handleLaunchVisualization(selectedItem)}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-cyan-500 text-black font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all active:scale-95"
                      >
                        <ExternalLink size={16} strokeWidth={3} /> Reconstruct Mapping
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/5">
                  <Database size={120} className="mb-4" />
                  <p className="text-[12px] font-black uppercase tracking-[1em] italic">Vault Standby</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HistoryPage;
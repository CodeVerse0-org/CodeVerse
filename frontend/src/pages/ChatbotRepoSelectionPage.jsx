import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Search, Github, ChevronRight, Terminal, Cpu, AlertCircle 
} from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const ChatbotRepoSelectionPage = () => {
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [user, setUser] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    try {
      // 1. Fetch User
      const userRes = await fetch(`${API_URL}/auth/me`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      // 2. Fetch Repositories
      console.log("Fetching from:", `${API_URL}/api/github/developer/repos`);
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("API Response Data:", data); // Debugging log

        // Robust check: some APIs wrap arrays in an object like { repos: [] }
        if (Array.isArray(data)) {
          setProjects(data);
        } else if (data && typeof data === 'object' && Array.isArray(data.repos)) {
          setProjects(data.repos);
        } else {
          console.error("API did not return an array. Check console log above.");
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

  const filteredProjects = (projects || []).filter(p => {
    const name = p.full_name || p.name || "";
    return name.toLowerCase().includes(filterQuery.toLowerCase());
  });

  const handleSelectRepo = (repo) => {
    const repoPath = repo.full_name || repo.name;
    navigate(`/chatbot?repo=${encodeURIComponent(repoPath)}&inst=${repo.installation_id || ''}`);
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-400 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />
        
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#010203] border-l border-white/5">
          <header className="h-24 border-b border-white/5 flex items-center px-10 bg-black/40 backdrop-blur-md justify-between z-10">
            <div className="flex items-center gap-5">
              <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                <Cpu size={24} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-white italic">AI Context Selection</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-[.3em] mt-1 font-bold">Select a repository to begin an AI-powered code session</p>
              </div>
            </div>

            <div className="relative w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="FILTER REPOSITORIES..." 
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-[10px] font-bold tracking-widest text-cyan-400 outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 bg-white/5 animate-pulse rounded-[32px] border border-white/5" />
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((repo, idx) => {
                  const displayName = repo.full_name || repo.name || "Unknown Repo";
                  const owner = displayName.includes('/') ? displayName.split("/") : "User";
                  const project = displayName.includes('/') ? displayName.split("/") : displayName;

                  return (
                    <div 
                      key={repo.id || idx}
                      onClick={() => handleSelectRepo(repo)}
                      className="group relative bg-[#050505] border border-white/5 p-6 rounded-[32px] cursor-pointer hover:border-cyan-500/40 transition-all duration-500 hover:bg-black shadow-lg"
                    >
                      <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 rounded-[32px] transition-opacity duration-500" />
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-cyan-500 group-hover:text-black transition-all duration-500 shadow-inner">
                            <Box size={22} />
                          </div>
                          <div className="bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-500/10">
                             <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Context Ready</span>
                          </div>
                        </div>

                        <div className="space-y-1 mb-6">
                          <h3 className="text-white font-black text-lg tracking-tight truncate group-hover:text-cyan-400 transition-colors">
                            {project}
                          </h3>
                          <div className="flex items-center gap-2">
                             <Github size={12} className="text-gray-700" />
                             <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest font-bold">
                               {owner}
                             </p>
                          </div>
                        </div>

                        <div className="pt-5 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-cyan-500/40 group-hover:text-cyan-400 transition-colors">
                             <Terminal size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Start Session</span>
                          </div>
                          <ChevronRight size={18} className="text-gray-800 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
                <AlertCircle size={48} className="text-gray-600" />
                <p className="text-sm font-black uppercase tracking-widest text-gray-500">No Repositories Linked</p>
                <button 
                  onClick={fetchData}
                  className="text-[10px] text-cyan-500 underline uppercase tracking-widest font-bold"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.3); }
      `}</style>
    </div>
  );
};

export default ChatbotRepoSelectionPage;
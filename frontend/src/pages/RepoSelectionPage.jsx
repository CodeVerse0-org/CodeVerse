import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Network, CheckCircle2, Loader2 } from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar"; 

const RepoSelectionPage = () => {
  const navigate = useNavigate();
  
  // --- Persistent Sidebar State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [installationId, setInstallationId] = useState(null);
  const [user, setUser] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchData = useCallback(async () => {
    setLoadingProjects(true);
    const token = localStorage.getItem("token");
    try {
      const userRes = await fetch(`${API_URL}/auth/me`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (userRes.ok) setUser(await userRes.json());

      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        const found = data.find(r => r.installation_id);
        if (found) setInstallationId(found.installation_id);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProcess = () => {
    if (!selectedRepo || !installationId) return;
    navigate(`/visualization?repo=${encodeURIComponent(selectedRepo)}&inst=${installationId}`);
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #0a0a0a 25%, #1a1a1a 50%, #0a0a0a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>

      <DeveloperNavbar toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-12 border-b border-white/5 flex items-center px-6 bg-black/40 backdrop-blur-xl justify-between z-20">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">Repository Selection</h2>
            <div className="text-[10px] text-gray-500">
              {projects.length} Total Repositories
            </div>
          </header>

          <main className="flex-1 p-8 flex gap-8 overflow-hidden bg-[#010203]">
            <div className="w-1/3 border border-white/5 rounded-xl bg-black/40 overflow-y-auto custom-scrollbar flex flex-col">
              {loadingProjects ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Loader2 size={14} className="animate-spin text-cyan-500" />
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">Fetching Repositories</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-12 w-full skeleton rounded-md border border-white/5"></div>
                  ))}
                </div>
              ) : (
                projects.map(repo => (
                  <div 
                    key={repo.full_name} 
                    onClick={() => setSelectedRepo(repo.full_name)} 
                    className={`p-4 border-b border-white/5 flex justify-between items-center cursor-pointer transition-all ${
                      selectedRepo === repo.full_name 
                        ? 'bg-cyan-950/20 text-cyan-400 border-l-2 border-l-cyan-500' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs font-mono truncate mr-2">{repo.full_name}</span>
                    {selectedRepo === repo.full_name && <CheckCircle2 size={14} className="shrink-0 text-cyan-500" />}
                  </div>
                ))
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-white/5 rounded-xl bg-black/40 p-10 relative overflow-hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full"></div>
                <Network 
                  size={80} 
                  className={`relative transition-all duration-700 ${
                    selectedRepo ? 'text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-110' : 'text-gray-800'
                  }`} 
                />
              </div>
              
              <div className="mt-8 text-center max-w-sm">
                <button 
                  onClick={handleProcess} 
                  disabled={!selectedRepo || !installationId || loadingProjects} 
                  className="bg-cyan-600 px-12 py-3 rounded text-white text-xs font-black uppercase tracking-widest disabled:opacity-20 disabled:grayscale hover:bg-cyan-500 transition-all active:scale-95 shadow-xl shadow-cyan-900/40"
                >
                  Analyze Repository
                </button>

                <div className="h-10 mt-4">
                  {!selectedRepo && !loadingProjects && (
                    <p className="text-[10px] text-gray-600 uppercase tracking-tighter animate-pulse">
                      Select a repository from the left panel to begin
                    </p>
                  )}
                  
                  {selectedRepo && (
                    <p className="text-[11px] text-cyan-400 font-mono tracking-wider">
                      Ready to analyze: <span className="text-white">{selectedRepo.split('/').pop()}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RepoSelectionPage;
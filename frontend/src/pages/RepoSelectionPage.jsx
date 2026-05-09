import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Network, Github, AlertCircle, ArrowRight, ShieldCheck, Box, Search } from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar"; 

const RepoSelectionPage = () => {
  const navigate = useNavigate();
  
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

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (userRes.ok) setUser(await userRes.json());

      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredProjects = projects.filter(p => 
    p.full_name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleRepoClick = (repo) => {
    setSelectedRepo(repo.full_name);
    setInstallationId(repo.installation_id);
  };

  // UPDATED: Logic to allow navigation even without installationId
  const handleProcess = () => {
    if (!selectedRepo) return;
    // Pass the installation ID if it exists, otherwise pass an empty string or null
    const inst = installationId || "not_installed";
    navigate(`/visualization?repo=${encodeURIComponent(selectedRepo)}&inst=${inst}`);
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-400 font-sans overflow-hidden selection:bg-cyan-500/30">
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .skeleton { background: linear-gradient(90deg, #050505 25%, #0f172a 50%, #050505 75%); background-size: 200% 100%; animation: shimmer 2s infinite linear; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }

        .scanline {
          width: 100%; height: 100px; z-index: 10;
          background: linear-gradient(0deg, rgba(34, 211, 238, 0.05) 0%, transparent 100%);
          position: absolute; bottom: 0; left: 0;
          animation: scan 4s linear infinite;
        }
        @keyframes scan { from { transform: translateY(0); } to { transform: translateY(-800%); } }
      `}</style>

      <DeveloperNavbar toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-20 border-b border-white/5 flex items-center px-10 bg-black/20 backdrop-blur-md justify-between z-20">
            <div className="flex items-center gap-5">
               <div className="bg-white/5 p-3 rounded-xl">
                 <Github size={20} className="text-white" />
               </div>
               <div>
                 <h2 className="text-sm font-black uppercase tracking-[.25em] text-white">Repository Browser</h2>
                 <p className="text-[11px] text-gray-500 uppercase tracking-widest mt-1">Select a target for architecture mapping</p>
               </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-black text-cyan-500 leading-none">{filteredProjects.length}</span>
              <span className="text-[10px] uppercase tracking-tighter text-gray-600 font-bold">Active Targets</span>
            </div>
          </header>

          <main className="flex-1 p-8 lg:p-12 flex gap-8 overflow-hidden bg-[#020405]">
            <div className="w-[420px] flex flex-col border border-white/5 rounded-3xl bg-black/60 backdrop-blur-sm overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
                <Search size={18} className="text-gray-600" />
                <input 
                  type="text" 
                  placeholder="FILTER REPOSITORIES..." 
                  className="w-full bg-transparent text-xs font-bold tracking-widest focus:text-cyan-400 outline-none transition-all placeholder:text-gray-700"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loadingProjects ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 w-full skeleton rounded-2xl opacity-50" />)}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {filteredProjects.map(repo => (
                      <div 
                        key={repo.full_name} 
                        onClick={() => handleRepoClick(repo)} 
                        className={`group relative p-6 border-b border-white/[0.03] flex items-center gap-5 cursor-pointer transition-all duration-300 ${
                          selectedRepo === repo.full_name 
                            ? 'bg-cyan-500/10' 
                            : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        {selectedRepo === repo.full_name && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500 shadow-[0_0_20px_#22d3ee]" />
                        )}
                        
                        <div className={`p-3 rounded-2xl transition-all duration-500 ${selectedRepo === repo.full_name ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'}`}>
                          <Box size={22} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-black truncate tracking-tight transition-colors ${selectedRepo === repo.full_name ? 'text-white' : 'text-gray-300'}`}>
                            {repo.full_name.split('/')[1]}
                          </h3>
                          <p className={`text-[11px] font-mono tracking-tighter mt-0.5 ${selectedRepo === repo.full_name ? 'text-cyan-500/70' : 'text-gray-600'}`}>
                            {repo.full_name.split('/')[0]}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {repo.installation_id ? (
                            <ShieldCheck size={18} className={selectedRepo === repo.full_name ? 'text-cyan-400' : 'text-emerald-500/40'} />
                          ) : (
                            <AlertCircle size={18} className="text-rose-500/40" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center border border-white/5 rounded-[40px] bg-black/40 p-16 relative overflow-hidden group shadow-inner">
              <div className="scanline" />
              
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-500/20 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full" />
              </div>

              <div className="relative z-20 flex flex-col items-center max-w-md w-full">
                <div className="relative mb-12">
                  <div className={`absolute inset-0 blur-[120px] rounded-full transition-all duration-1000 scale-150 ${selectedRepo ? 'bg-cyan-500/40' : 'bg-white/5'}`}></div>
                  
                  <div className={`relative w-40 h-40 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${selectedRepo ? 'border-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.3)] rotate-90' : 'border-white/10'}`}>
                    <Network size={72} className={`${selectedRepo ? 'text-cyan-400 -rotate-90' : 'text-gray-800'} transition-all duration-700`} />
                  </div>
                </div>
                
                <div className="text-center space-y-4 mb-14">
                   <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                     {selectedRepo ? "Visualization Ready" : "Select Repository"}
                   </h1>
                   <p className="text-xs text-gray-500 uppercase tracking-[.4em] font-bold leading-relaxed">
                     {selectedRepo 
                       ? `Analyzing ${selectedRepo.split('/')[1]}` 
                       : "Initialize connection by selecting a repository"}
                   </p>
                </div>

                <button 
                  onClick={handleProcess} 
                  disabled={!selectedRepo} 
                  className="group/btn relative w-full flex items-center justify-center gap-5 bg-transparent border-2 border-cyan-500/50 py-6 rounded-2xl text-cyan-400 text-sm font-black uppercase tracking-[.5em] overflow-hidden transition-all hover:border-cyan-400 hover:text-white disabled:opacity-10"
                >
                  <div className="absolute inset-0 bg-cyan-500 translate-y-[101%] group-hover/btn:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-4">
                    Initialize Analysis
                    <ArrowRight size={20} className="group-hover/btn:translate-x-3 transition-transform" />
                  </span>
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
import React, { useState, useEffect } from "react";
import { FileCode, Search, Box, Layers, Loader2, AlertCircle } from "lucide-react";
import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const SummaryPage = () => {
  const [projects, setProjects] = useState([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchRepos = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/api/github/developer/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setProjects(await res.json());
      } catch (err) {
        console.error("Initial load error:", err);
      }
    };
    fetchRepos();
  }, [API_URL]);

  const handleRepoClick = async (repo) => {
    setError(null);
    setSelectedRepo(repo);
    setSelectedFile(null);
    setFiles([]); // Clear previous files
    setLoading(true);
    
    try {
      // Pass the installation_id so backend can authenticate
      const res = await fetch(
        `${API_URL}/api/repos/files?full_repo=${repo.full_name}&inst_id=${repo.installation_id}`
      );
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to access repository");
      }
      
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError(err.message);
      setSelectedRepo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (file) => {
    if (file.summary) { setSelectedFile(file); return; }
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/repos/summarize-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          repo_name: selectedRepo.full_name, 
          path: file.path,
          inst_id: selectedRepo.installation_id 
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setSelectedFile(updated);
        setFiles(prev => prev.map(f => f.path === file.path ? updated : f));
      } else {
        throw new Error("AI Summary failed to generate.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-400 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar isOpen={isSidebarOpen} />
        
        <main className="flex-1 flex overflow-hidden relative">
          {/* REPOSITORY LIST */}
          <div className="w-80 border-r border-white/5 bg-black/40 flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
               <h2 className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-500 mb-3">Active Targets</h2>
               <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-gray-600" size={14} />
                 <input 
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 text-[10px] font-bold outline-none focus:border-cyan-500/50"
                    placeholder="SEARCH REPOS..."
                    onChange={(e) => setFilterQuery(e.target.value)}
                 />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {projects.filter(p => p.full_name.toLowerCase().includes(filterQuery.toLowerCase())).map(repo => (
                <div 
                  key={repo.full_name}
                  onClick={() => handleRepoClick(repo)}
                  className={`p-4 border-b border-white/[0.03] cursor-pointer transition-all ${selectedRepo?.full_name === repo.full_name ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500' : 'hover:bg-white/5'}`}
                >
                  <p className="text-xs font-black text-white truncate">{repo.full_name.split('/')}</p>
                  <p className="text-[9px] text-gray-600 font-mono tracking-tighter italic">{repo.full_name.split('/')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SOURCE EXPLORER */}
          <div className="w-72 border-r border-white/5 bg-black/20 flex flex-col">
            <div className="p-4 border-b border-white/5 uppercase text-[10px] font-black tracking-widest text-gray-500">Explorer</div>
            <div className="flex-1 overflow-y-auto p-2">
              {selectedRepo ? (
                files.map(file => (
                  <button 
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg mb-1 text-left transition-all ${selectedFile?.path === file.path ? 'bg-cyan-500/5 text-cyan-400' : 'hover:bg-white/5'}`}
                  >
                    <FileCode size={14} className={selectedFile?.path === file.path ? "text-cyan-400" : "text-gray-600"} />
                    <span className="text-[11px] truncate font-medium">{file.label}</span>
                  </button>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-gray-700 text-center px-10">Select a target to begin exploration</div>
              )}
            </div>
          </div>

          {/* CONTENT DISPLAY */}
          <div className="flex-1 bg-[#020405] relative overflow-y-auto p-10">
            {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <Loader2 className="text-cyan-500 animate-spin mb-4" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-[.3em] text-cyan-500 animate-pulse">Syncing with CodeVerse AI...</p>
                </div>
            )}

            {error && (
              <div className="max-w-md mx-auto mt-20 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
                <AlertCircle size={24} />
                <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
              </div>
            )}

            {selectedFile ? (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                  <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                    <Layers className="text-cyan-400" size={32} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedFile.label}</h1>
                    <p className="text-[10px] font-mono text-cyan-500/50 mt-1 uppercase tracking-widest">{selectedFile.path}</p>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/5 rounded-[40px] p-10 shadow-inner">
                  <h3 className="text-cyan-500 text-[10px] font-black uppercase tracking-[.5em] mb-8 opacity-50">Analysis Result</h3>
                  <p className="text-gray-300 text-lg leading-relaxed font-light italic">
                    {selectedFile.summary || "Summary data stream unavailable."}
                  </p>
                </div>
              </div>
            ) : !error && (
              <div className="h-full flex flex-col items-center justify-center opacity-5 select-none">
                <Box size={120} />
                <p className="mt-4 text-xs font-black uppercase tracking-[1em]">Core Offline</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SummaryPage;
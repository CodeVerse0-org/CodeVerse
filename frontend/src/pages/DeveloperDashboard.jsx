import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Eye, Folder, Search, AlertCircle, RefreshCcw, Loader2, 
  Terminal, LayoutDashboard, Clock, BarChart3, ChevronRight 
} from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState("");

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

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const fetchRepos = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(r => ({
          id: r.repo_id,
          name: r.repo_name,
          fullName: r.full_name,
          url: r.html_url,
        }));
      }
      return [];
    } catch (err) {
      console.error("Fetch Repos Error:", err);
      return [];
    }
  }, [API_URL]);

  const initDashboard = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired");
        throw new Error("Server communication failed");
      }
      
      const userData = await res.json();
      setUser(userData);

      const repoData = await fetchRepos(token);
      setProjects(repoData);
    } catch (err) {
      setError(err.message);
      if (err.message === "Session expired") {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoadingData(false);
    }
  }, [API_URL, fetchRepos, navigate]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  // Filter Logic
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden selection:bg-cyan-500/30">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Top Breadcrumb Header */}
          {/* <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-2xl shrink-0 z-20">
            <div className="flex items-center gap-3">
              <LayoutDashboard size={14} className="text-cyan-500" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Developer </h2>
            </div>
          </header> */}

          <main className="flex-1 p-10 flex gap-10 overflow-y-auto bg-[#010203] custom-scrollbar relative">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 relative z-10">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight leading-none">Developer Dashboard</h1>
                  <p className="text-[13px] text-gray-500 mt-3 font-medium">Access and visualize your assigned project repositories.</p>
                </div>
                <button className="bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all duration-300 flex items-center gap-3">
                  <Plus size={18} strokeWidth={3} /> New Project
                </button>
              </div>

              {/* SEARCH BAR */}
              <div className="relative mb-12">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search your repositories..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[13px] text-gray-200 focus:outline-none focus:border-cyan-500/50 transition-all" 
                />
              </div>

              {/* TABLE */}
              <div className="border border-white/10 rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl min-h-[400px] flex flex-col shadow-2xl">
                {loadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-cyan-500" size={32} />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Syncing...</span>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] border-b border-white/5 text-gray-500">
                      <tr>
                        <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Project Name</th>
                        <th className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-center">Path</th>
                        <th className="px-8 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((p) => (
                          <tr key={p.id} className="group hover:bg-white/[0.01] transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
                                  <Folder size={18} className="text-cyan-500/50" />
                                </div>
                                <span className="text-[14px] text-gray-200 font-bold">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-gray-500 text-center font-mono text-[12px]">{p.fullName}</td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => navigate(`/visualization/select`)} 
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-cyan-500 hover:text-white transition-all shadow-lg shadow-cyan-950/20"
                              >
                                Visulization <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center opacity-40">
                              <Search size={40} className="mb-4" />
                              <p className="text-sm font-bold uppercase tracking-widest">No matching repositories</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* RIGHT SIDE PANEL */}
            <div className="w-80 shrink-0 space-y-6 relative z-10">
              {/* STATS CARD */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <BarChart3 size={18} className="text-cyan-500" />
                  <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Overview</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Repositories</p>
                    <p className="text-4xl font-black text-white">{projects.length}</p>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Active Sessions</p>
                    <p className="text-2xl font-black text-cyan-500">01</p>
                  </div>
                </div>
              </div>

              {/* RECENT LOG CARD */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-xl flex-1">
                <div className="flex items-center gap-3 mb-8">
                  <Clock size={18} className="text-gray-500" />
                  <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Last Sync</h3>
                </div>
                <div className="space-y-6">
                    <div className="flex gap-4">
                       <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1" />
                       <div>
                         <p className="text-[12px] font-bold text-gray-300">Repository List Updated</p>
                         <p className="text-[10px] text-gray-600 font-medium uppercase mt-1">Just now</p>
                       </div>
                    </div>
                    <div className="flex gap-4 opacity-50">
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-700 mt-1" />
                       <div>
                         <p className="text-[12px] font-bold text-gray-400">Session Authenticated</p>
                         <p className="text-[10px] text-gray-600 font-medium uppercase mt-1">12 mins ago</p>
                       </div>
                    </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
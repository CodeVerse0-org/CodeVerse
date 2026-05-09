import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { 
  Plus, Folder, Search, Loader2, BellRing, ChevronRight, BarChart3, Clock 
} from "lucide-react";

import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const socket = useRef(null);

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updateNotification, setUpdateNotification] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const fetchRepos = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/github/developer/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(r => ({
          id: r.id || r.repo_id, // Ensure we get the GitHub ID
          name: r.name || r.repo_name,
          fullName: r.full_name,
          url: r.html_url,
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  }, [API_URL]);

  // WebSocket logic - Joins rooms based on the fetched projects
  const setupWebSocket = useCallback((repoList) => {
  if (socket.current) socket.current.disconnect();

  // 1. Ensure the URL doesn't have a trailing slash
  // 2. Add trailing slash to the PATH
  socket.current = io("http://localhost:8000", {
    transports: ["websocket"], // THIS IS KEY: Forces it to skip the 'pending' polling phase
    path: "/socket.io/",       // Try adding the trailing slash here
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  socket.current.on("connect", () => {

  console.log("✅ Dashboard Socket Connected");

  const repoIds = repoList.map((p) => p.id);

  console.log("📦 JOINING REPOS:", repoIds);

  // SAVE FOR NAVBAR
  localStorage.setItem(
    "repoIds",
    JSON.stringify(repoIds)
  );

  socket.current.emit("join_repos", {
    repoIds,
  });
});

  socket.current.on("connect_error", (err) => {
    console.error("❌ Socket Connection Error:", err.message);
  });
}, []);

  const initDashboard = useCallback(async () => {
    setLoadingData(true);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Session expired");
      const userData = await res.json();
      setUser(userData);

      // Fetch the repos THIS user is allowed to see
      const repoData = await fetchRepos(token);
      setProjects(repoData);
      const repoIds = repoData.map(r => r.id);

console.log("📦 SAVING REPO IDS:", repoIds);

localStorage.setItem(
  "repoIds",
  JSON.stringify(repoIds)
);
      // Connect to Socket and listen for updates to THESE repos only
      setupWebSocket(repoData);

    } catch (err) {
      if (err.message === "Session expired") navigate("/login");
    } finally {
      setLoadingData(false);
    }
  }, [API_URL, fetchRepos, navigate, setupWebSocket]);

  useEffect(() => {
    initDashboard();
    return () => {
      socket.current?.disconnect();
    };
  }, [initDashboard]);

  const handleSync = async () => {
    if (!updateNotification) return;
    setLoadingData(true);
    const repoFullName = updateNotification.fullName;
    
    try {
      const token = localStorage.getItem("token");
      // 1. Call your actual backend Sync/Process endpoint here
      // await fetch(`${API_URL}/api/github/sync`, { ... });
      
      setUpdateNotification(null);
      const updatedRepos = await fetchRepos(token);
      setProjects(updatedRepos);
      alert(`Synchronized ${repoFullName}. Visualizations are being regenerated.`);
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-300 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* DYNAMIC NOTIFICATION POPUP */}
      {updateNotification && (
        <div className="fixed top-20 right-10 z-[110] animate-in fade-in slide-in-from-right-5 duration-500">
          <div className="bg-[#0a0f14]/95 border border-cyan-500/40 p-6 rounded-2xl shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)] w-96 backdrop-blur-2xl">
            <div className="flex items-start gap-4">
              <div className="bg-cyan-500/20 p-3 rounded-xl border border-cyan-500/20">
                <BellRing className="text-cyan-400 animate-pulse" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm">Update Available</h4>
                <p className="text-gray-400 text-[12px] mt-2 leading-relaxed">
                  <span className="text-cyan-400 font-mono font-bold">{updateNotification.pusher}</span> updated 
                  <span className="text-white font-bold ml-1">{updateNotification.repoName}</span>.
                </p>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleSync} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-900/20">
                    Synchronize Codebase
                  </button>
                  <button onClick={() => setUpdateNotification(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-black py-2.5 rounded-lg transition-all">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <main className="flex-1 p-10 flex gap-10 overflow-y-auto bg-[#010203] relative">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex-1 relative z-10">
              <header className="mb-8">
                <h1 className="text-3xl font-black text-white tracking-tight">Project Hub</h1>
                <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">Manage and Visualize Repositories</p>
              </header>

              <div className="relative my-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search your repositories..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-[13px] text-gray-200 focus:outline-none focus:border-cyan-500/50 transition-colors" 
                />
              </div>

              <div className="border border-white/10 rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl min-h-[400px]">
                {loadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center h-[400px]">
                    <Loader2 className="animate-spin text-cyan-500 mb-4" size={32} />
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Initialising Systems...</span>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] border-b border-white/5 text-gray-500">
                      <tr>
                        <th className="px-8 py-5 font-black text-[10px] uppercase">Repository</th>
                        <th className="px-8 py-5 font-black text-[10px] uppercase text-center">Identity Path</th>
                        <th className="px-8 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((p) => (
                          <tr key={p.id} className="group hover:bg-white/[0.01] transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/5 flex items-center justify-center border border-white/5 group-hover:border-cyan-500/30 transition-all">
                                  <Folder size={18} className="text-cyan-500/50 group-hover:text-cyan-400" />
                                </div>
                                <span className="text-[14px] text-gray-200 font-bold">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-gray-500 text-center font-mono text-[11px]">{p.fullName}</td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => navigate(`/visualization/select`)} 
                                className="px-6 py-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl text-[11px] font-black uppercase hover:bg-cyan-500 hover:text-white transition-all flex items-center gap-2 ml-auto"
                              >
                                View Analytics <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                           <td colSpan="3" className="text-center py-20 text-gray-600 text-xs">No repositories found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="w-80 shrink-0 space-y-6 z-10">
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-xl hover:border-cyan-500/20 transition-all group">
                <BarChart3 size={18} className="text-cyan-500 mb-8 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Managed Repos</p>
                <p className="text-4xl font-black text-white">{projects.length}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-xl">
                <Clock size={18} className="text-gray-500 mb-8" />
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">System Status</p>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                   <p className="text-xs font-bold text-gray-300">Live Sync Active</p>
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
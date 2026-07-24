import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GitBranch, Lock, Globe, ExternalLink, RefreshCcw, 
  Search, Database, Github, Loader2, Code2 
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import DeveloperNavbar from "../components/AdminNavbar";

const Repositories = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    console.log("Repositories Token:", token);
    const headers = { Authorization: `Bearer ${token}` };
    console.log("Repositories Headers:", headers);

    try {
      const [statusRes, adminRes] = await Promise.all([
        fetch(`${API_URL}/api/github/status`, { headers }),
        fetch(`${API_URL}/auth/me`, { headers }),
      ]);

      if (statusRes.ok && adminRes.ok) {
        const statusData = await statusRes.json();
        const adminData = await adminRes.json();

        setIsConnected(statusData.connected);
        setAdmin({
          name: `${adminData.first_name} ${adminData.last_name}`,
          email: adminData.email,
        });

        if (statusData.connected) {
  console.log("Repositories URL:", `${API_URL}/api/github/repositories`);

  const repoRes = await fetch(`${API_URL}/api/github/repositories`, {
    headers,
  });

  console.log("Repositories Status:", repoRes.status);

  const repoData = await repoRes.json();

  console.log("Repositories Response:", repoData);

  setRepos(repoData.repositories || []);
}
      }
    } catch (err) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar admin={admin} isConnected={isConnected} isOpen={isSidebarOpen} />
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Inventory / Repositories</h2>
          </header> */}

          <main className="flex-1 p-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="max-w-[1600px] mx-auto">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
                <div>
                  <h1 className="text-4xl font-extrabold text-white flex items-center gap-4 tracking-tight">
                    Repositories <Database className="text-cyan-500" size={36} />
                  </h1>
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input 
                      type="text" 
                      placeholder="Filter repositories..." 
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-cyan-500/50 transition-all"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button onClick={fetchData} className="p-3 bg-white/[0.03] border border-white/10 rounded-xl hover:text-cyan-400">
                    <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                  <Loader2 className="animate-spin text-cyan-500 mb-4" size={48} />
                  <span className="text-sm uppercase tracking-widest text-gray-500 font-black">Syncing...</span>
                </div>
              ) : !isConnected ? (
                <div className="flex flex-col items-center justify-center py-24 bg-black/20 border-2 border-dashed border-white/5 rounded-[2rem]">
                  <Github size={64} className="text-red-500/80 mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">VCS DISCONNECTED</h2>
                  <button 
                    onClick={() => navigate("/adminDashboard")} 
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-4 rounded-xl font-black text-xs uppercase"
                  >
                    Connect GitHub
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                  {filteredRepos.map(repo => (
                    <div key={repo.id} className="group bg-black/20 border border-white/10 p-8 rounded-[2rem] hover:border-cyan-500/40 transition-all flex flex-col justify-between h-[280px]">
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="p-3 bg-cyan-500/10 rounded-2xl">
                            <GitBranch className="text-cyan-400" size={24} />
                          </div>
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${repo.private ? 'bg-white/5 text-gray-500' : 'bg-green-500/10 text-green-500'}`}>
                            {repo.private ? <Lock size={12} /> : <Globe size={12} />} {repo.private ? 'Private' : 'Public'}
                          </div>
                        </div>
                        <h3 className="text-xl font-black text-white mb-3 truncate">{repo.name}</h3>
                        <p className="text-gray-500 text-sm line-clamp-2">{repo.description || "No description provided."}</p>
                      </div>
                      <div className="flex justify-between items-center pt-6 border-t border-white/5">
                        <span className="text-sm font-bold text-cyan-400/80">{repo.language || "Universal"}</span>
                        {/* <a href={repo.html_url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400">
                          <ExternalLink size={20} />
                        </a> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Repositories;
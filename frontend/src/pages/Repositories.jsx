import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { GitBranch, Lock, Globe, ExternalLink, RefreshCcw, Search, Database, Github } from "lucide-react";

const Repositories = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [admin, setAdmin] = useState({ name: "", email: "" });
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // --- Improved error handling block ---
        const [statusRes, adminRes] = await Promise.all([
          fetch(`${API_URL}/api/github/status`, { headers }),
          fetch(`${API_URL}/auth/me`, { headers }),
        ]);

        if (!statusRes.ok || !adminRes.ok) {
          throw new Error("Unauthorized or server error");
        }

        const statusData = await statusRes.json();
        const adminData = await adminRes.json();

        setIsConnected(statusData.connected);
        setAdmin({
          name: `${adminData.first_name} ${adminData.last_name}`,
          email: adminData.email,
        });

        if (statusData.connected) {
          const repoRes = await fetch(`${API_URL}/api/github/repositories`, { headers });
          if (!repoRes.ok) throw new Error("Repo fetch failed");

          const repoData = await repoRes.json();
          setRepos(repoData.repositories || []);
        }
      } catch (err) {
        console.error("Fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, API_URL]);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-black via-[#041a1f] to-black text-white font-sans">
      <Sidebar admin={admin} isConnected={isConnected} />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-bold flex items-center gap-3"><Database className="text-cyan-500" /> Repositories</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" placeholder="Search..." 
                className="bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 outline-none focus:border-cyan-500"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><RefreshCcw className="animate-spin text-cyan-500" size={40} /></div>
          ) : !isConnected ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <Github size={48} className="mx-auto mb-4 text-gray-600" />
              <h2 className="text-xl font-bold">Not Connected to GitHub</h2>
              <button onClick={() => navigate("/adminDashboard")} className="mt-4 bg-cyan-600 px-6 py-2 rounded-lg">Connect Now</button>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No repositories found. Check your GitHub App installation permissions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRepos.map(repo => (
                <div key={repo.id} className="bg-black/40 border border-white/10 p-6 rounded-2xl hover:border-cyan-500/50 transition-all">
                  <div className="flex justify-between mb-4">
                    <GitBranch className="text-cyan-400" />
                    {repo.private ? <Lock size={14} className="text-gray-500" /> : <Globe size={14} className="text-green-500" />}
                  </div>
                  <h3 className="font-bold mb-2 truncate">{repo.name}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">{repo.description || "No description provided."}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-xs text-cyan-500">{repo.language || "Stack"}</span>
                    <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white"><ExternalLink size={18} /></a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Repositories;

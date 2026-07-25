import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  RefreshCcw, 
  Github, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Lock, 
  Globe 
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import DeveloperNavbar from "../components/AdminNavbar";

const InviteUsers = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [repos, setRepos] = useState([]);
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // Fetch Admin Info, GitHub Status, and Repositories
        const [statusRes, adminRes] = await Promise.all([
          fetch(`${API_URL}/api/github/status`, { headers }),
          fetch(`${API_URL}/auth/me`, { headers }),
        ]);

        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setAdmin({
            name: `${adminData.first_name} ${adminData.last_name}`,
            email: adminData.email,
          });
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsConnected(statusData.connected);

          if (statusData.connected) {
  console.log("Invite URL:", `${API_URL}/api/github/repositories`);
  console.log("Invite TOKEN:", token);
  console.log("Invite HEADERS:", headers);

  const repoRes = await fetch(`${API_URL}/api/github/repositories`, {
    headers,
  });

  console.log("Invite Status:", repoRes.status);

  const repoData = await repoRes.json();

  console.log("Invite Response:", repoData);

  setRepos(repoData.repositories || []);
}
        }
      } catch (err) {
        console.error("Invite page fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, API_URL]);

  const toggleRepo = (id) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const sendInvite = async () => {
    if (!email) return alert("Please enter an email.");
    if (selectedRepos.length === 0) return alert("Please select at least one repository.");

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, repo_ids: selectedRepos }),
      });

      if (res.ok) {
        alert("Invitation sent successfully!");
        setEmail("");
        setSelectedRepos([]);
      } else {
        const data = await res.json();
        alert(`Error: ${data.detail}`);
      }
    } catch (err) {
      alert("Failed to send invite.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#020405] text-gray-200 font-sans overflow-hidden">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar admin={admin} isConnected={isConnected} isOpen={isSidebarOpen} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-14 border-b border-white/5 flex items-center px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Access Management / Send Invitation</h2>
          </header>

          <main className="flex-1 p-10 overflow-y-auto bg-[#010203] custom-scrollbar">
            <div className="max-w-5xl mx-auto">
              
              {/* Header */}
              <div className="mb-12">
                <h1 className="text-4xl font-extrabold text-white flex items-center gap-4 tracking-tight">
                  Invite User <UserPlus className="text-cyan-500" size={36} />
                </h1>
                <p className="text-sm text-gray-400 mt-2 font-medium">Provision developer access to specific repository assets.</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                
                {/* User Info Form */}
                <div className="bg-black/20 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center gap-3 mb-6 text-cyan-400">
                    <Mail size={20} />
                    <h2 className="text-sm font-black uppercase tracking-widest">Developer Details</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="developer@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Access Level</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-cyan-500/50 appearance-none text-white font-bold cursor-pointer"
                      >
                        <option className="bg-[#020405]">Developer</option>
              
                      </select>
                    </div>
                  </div>
                </div>

                {/* Repository Selection */}
                <div className="bg-black/20 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3 text-cyan-400">
                      <ShieldCheck size={20} />
                      <h2 className="text-sm font-black uppercase tracking-widest">Repositories</h2>
                    </div>
                    <span className="text-[10px] font-black bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase text-gray-400">
                      {selectedRepos.length} Selected
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                      <Loader2 className="animate-spin text-cyan-500" size={40} />
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Fetching VCS Data...</p>
                    </div>
                  ) : !isConnected ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                      <Github size={48} className="mx-auto mb-4 text-gray-700" />
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">GitHub Instance Offline</p>
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                          <tr>
                            <th className="p-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Repository</th>
                            <th className="p-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Visibility</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {repos.map((repo) => (
                            <tr
                              key={repo.id}
                              onClick={() => toggleRepo(repo.id)}
                              className={`cursor-pointer transition-colors ${
                                selectedRepos.includes(repo.id) ? "bg-cyan-500/5" : "hover:bg-white/[0.02]"
                              }`}
                            >
                              <td className="p-4 flex items-center gap-4">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                  selectedRepos.includes(repo.id) 
                                    ? "bg-cyan-500 border-cyan-500" 
                                    : "border-white/20 bg-transparent"
                                }`}>
                                  {selectedRepos.includes(repo.id) && <CheckCircle2 size={14} className="text-black" />}
                                </div>
                                <span className={`text-sm font-bold ${selectedRepos.includes(repo.id) ? "text-cyan-400" : "text-gray-300"}`}>
                                  {repo.name}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase bg-white/5 border border-white/10 text-gray-500">
                                  {repo.private ? <Lock size={10} /> : <Globe size={10} />}
                                  {repo.private ? "Private" : "Public"}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end gap-4 mt-10">
                    {/* <button
                      className="px-8 py-4 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                      onClick={() => {
                        setEmail("");
                        setSelectedRepos([]);
                      }}
                    >
                      Reset Form
                    </button> */}
                    <button
                      disabled={!email || selectedRepos.length === 0}
                      className="px-10 py-4 rounded-xl bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/20"
                      onClick={sendInvite}
                    >
                      Authorize & Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default InviteUsers;
import React from "react";
import { useNavigate } from "react-router-dom";
import { Github, CheckCircle2, ShieldCheck, ListChecks } from "lucide-react";

const GitHubConnect = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleConnect = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/github/install-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.url) throw new Error("Failed to get install URL");
      window.location.href = data.url;
    } catch (err) {
      console.error("Connection error:", err);
    }
  };

  const handleSkip = () => navigate("/adminDashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020405] px-6 font-sans relative overflow-hidden">
      {/* Background radial glow to match image */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full bg-black/40 border border-white/5 backdrop-blur-xl rounded-[2.5rem] p-12 text-center relative z-10 shadow-2xl">
        
        {/* Header Section */}
        <header className="mb-10">
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter italic">
            Code<span className="text-[#209DB4]">Verse</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mt-2">Visualize Your Codebase</p>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-8" />
        </header>

        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white tracking-tight">Connect your GitHub Organization</h2>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Follow these steps below to integrate your organization's repositories with CodeVerse
          </p>
          <div className="w-24 h-1 bg-[#209DB4] mx-auto mt-6 rounded-full opacity-50" />
        </div>

        {/* Step List Section */}
        <div className="text-left space-y-8 mb-12 max-w-md mx-auto">
          <div className="flex gap-5 items-start group">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Authorize the GitHub App</h3>
              <p className="text-xs text-gray-500 mt-1">You will be redirected to GitHub to authorize application for your organization.</p>
            </div>
          </div>

          <div className="flex gap-5 items-start group">
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Grant Read-Only Permissions</h3>
              <p className="text-xs text-gray-500 mt-1">CodeVerse only requires read-only access to analyze your code. Your source code remains secure.</p>
            </div>
          </div>

          <div className="flex gap-5 items-start group">
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
              <ListChecks size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Repositories</h3>
              <p className="text-xs text-gray-500 mt-1">Choose which repositories you want the CodeVerse to access.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleSkip}
            className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            className="flex items-center justify-center gap-3 px-10 py-4 bg-[#209DB4] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white hover:shadow-[0_0_30px_rgba(32,157,180,0.4)] transition-all active:scale-95"
          >
            <Github size={18} />
            Connect with GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubConnect;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Zap, Shield, Search } from "lucide-react";
import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const AnalyzeProject = ({ user }) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (!repoUrl.includes("github.com")) {
      alert("Please enter a valid GitHub public repository URL.");
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Clean URL properly
      const cleanUrl = repoUrl
        .replace("https://github.com/", "")
        .replace("http://github.com/", "")
        .replace(/\/$/, "");

      const parts = cleanUrl.split("/");

      if (parts.length < 2) {
        throw new Error("Invalid URL format");
      }

      // ✅ Extract correctly
      const owner = parts[0];
      let repo = parts[1];

      // remove .git if present
      repo = repo.replace(".git", "");

      console.log("Analyzing Repository:", `${owner}/${repo}`);

      // ✅ Navigate correctly
      navigate(`/graph-visualizer/${owner}/${repo}`);

    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Failed to parse the repository URL. Please check the format.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#020408] text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <DeveloperSidebar user={user} isOpen={true} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* NAVBAR */}
        <DeveloperNavbar user={user} />

        <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-2xl w-full text-center z-10">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-6">
              <Zap size={12} /> Public Repository Parser
            </div>
            
            {/* Heading */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Analyze Any <span className="text-cyan-500">Public Project</span>
            </h1>
            
            {/* Description */}
            <p className="text-slate-400 mb-10 text-lg leading-relaxed">
              Paste a GitHub URL to visualize function calls, dependencies, and chat with the codebase.
            </p>

            {/* FORM */}
            <form onSubmit={handleAnalyze} className="relative group">
              
              {/* Glow Border */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              
              <div className="relative flex items-center bg-[#0d1117] border border-white/10 rounded-2xl p-2">
                
                {/* Icon */}
                <div className="pl-4 text-slate-500">
                  <Globe size={20} />
                </div>

                {/* Input */}
                <input
                  type="text"
                  placeholder="https://github.com/facebook/react"
                  className="w-full bg-transparent border-none outline-none px-4 py-3 text-white text-sm"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                />

                {/* Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap active:scale-95"
                >
                  {isLoading ? "Analyzing..." : "Start Analysis"} <ArrowRight size={18} />
                </button>
              </div>
            </form>

            {/* FEATURES */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                { icon: <Search size={20}/>, label: "Indexing", desc: "Neo4j Graph Mapping" },
                { icon: <Shield size={20}/>, label: "Secure", desc: "User Isolated Data" },
                { icon: <Zap size={20}/>, label: "Fast", desc: "Real-time Visualization" }
              ].map((feature, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="text-cyan-500 flex justify-center mb-2">{feature.icon}</div>
                  <div className="text-white text-[11px] font-bold mb-1 uppercase tracking-wider">{feature.label}</div>
                  <div className="text-slate-500 text-[10px] leading-tight">{feature.desc}</div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalyzeProject;
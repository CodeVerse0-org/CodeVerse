import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight } from "lucide-react";
import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const AnalyzeProject = ({ user }) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (e) => {
    e.preventDefault();

    // Fix 1: Ensure we look for the exact "token" key found in your localStorage
    let token = localStorage.getItem("token") || localStorage.getItem("access_token");
    
    const headers = {
      "Content-Type": "application/json",
    };

    // Fix 2: Cleaner token handling to prevent "Bearer Bearer" or malformed strings
    if (token && token !== "undefined" && token !== "null") {
      const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
      headers["Authorization"] = `Bearer ${cleanToken.trim()}`;
    }

    setIsLoading(true);

    try {
      // Clean the URL and extract owner/repo
      const urlPath = repoUrl
        .replace(/https?:\/\/github\.com\//, "")
        .replace(/\/$/, "");

      const parts = urlPath.split("/");
      const owner = parts[0];
      const repoName = parts[1]?.replace(".git", ""); 

      if (!owner || !repoName) throw new Error("Please enter a valid GitHub URL (e.g., github.com/user/repo)");
      
      const fullRepo = `${owner}/${repoName}`;

      const response = await fetch(
        `http://localhost:8000/api/repos/generate-all-graphs?full_repo=${encodeURIComponent(fullRepo)}`,
        {
          method: "POST",
          headers: headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = "Analysis failed";
        if (data.detail) {
          errorMessage = typeof data.detail === 'object' 
            ? (data.detail.message || JSON.stringify(data.detail)) 
            : data.detail;
        }
        throw new Error(errorMessage);
      }

      // Save graphs for the visualizer
      if (data.file_graph) sessionStorage.setItem("file_graph", JSON.stringify(data.file_graph));
      if (data.function_graph) sessionStorage.setItem("function_graph", JSON.stringify(data.function_graph));
      if (data.state_graph) sessionStorage.setItem("state_graph", JSON.stringify(data.state_graph));

      // Fix 3: Direct Navigation with query params to match VisualizationPage expectations
      navigate(`/graph-visualizer/${owner}/${repoName}?graphType=file&repo=${encodeURIComponent(fullRepo)}`);

    } catch (err) {
      console.error("Analysis Error:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#020408] text-slate-300 overflow-hidden">
      <DeveloperSidebar user={user} isOpen={true} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DeveloperNavbar user={user} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div className="max-w-2xl w-full text-center z-10">
            <h1 className="text-4xl font-bold text-white mb-6">
              Analyze <span className="text-cyan-500">Public Project</span>
            </h1>
            
            <form onSubmit={handleAnalyze} className="relative group">
              <div className="relative flex items-center bg-[#0d1117] border border-white/10 rounded-2xl p-2">
                <div className="pl-4 text-slate-500">
                  <Globe size={20} />
                </div>
                <input
                  type="text"
                  placeholder="https://github.com/user/repo"
                  className="w-full bg-transparent border-none outline-none px-4 py-3 text-white focus:ring-0"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Analyzing..." : "Start Analysis"} 
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalyzeProject;
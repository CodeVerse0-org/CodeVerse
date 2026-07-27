// AnalyzeProject.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Loader2, Github } from "lucide-react";
import DeveloperSidebar from "../components/DeveloperSidebar";
import DeveloperNavbar from "../components/DeveloperNavbar";

const AnalyzeProject = () => {
  const navigate = useNavigate();

  // =========================
  // STATES
  // =========================
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // =========================
  // SIDEBAR & DATA FETCHING
  // =========================
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setUser(await res.json());
        }
      } catch (err) {
        console.error("User Fetch Error:", err);
      }
    };
    fetchUser();
  }, [API_URL]);

  const handleAnalyze = async (e) => {
    e.preventDefault();

    let token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
    const headers = {
      "Content-Type": "application/json",
    };

    if (token && token !== "undefined" && token !== "null") {
      const cleanToken = token.startsWith("Bearer ")
        ? token.split(" ")[1]
        : token;
      headers["Authorization"] = `Bearer ${cleanToken.trim()}`;
    }

    setIsLoading(true);

    try {
      const urlPath = repoUrl
        .replace(/https?:\/\/github\.com\//, "")
        .replace(/\/$/, "");

      const parts = urlPath.split("/");
      const owner = parts[0];
      const repoName = parts[1]?.replace(".git", "");

      if (!owner || !repoName)
        throw new Error(
          "Please enter a valid GitHub URL (e.g., github.com/user/repo)",
        );

      const fullRepo = `${owner}/${repoName}`;

      const response = await fetch(
        `${API_URL}/api/repos/generate-all-graphs?full_repo=${encodeURIComponent(fullRepo)}`,
        {
          method: "POST",
          headers: headers,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = "Analysis failed";
        if (data.detail) {
          errorMessage =
            typeof data.detail === "object"
              ? data.detail.message || JSON.stringify(data.detail)
              : data.detail;
        }
        throw new Error(errorMessage);
      }

      if (data.file_graph)
        sessionStorage.setItem("file_graph", JSON.stringify(data.file_graph));
      if (data.function_graph)
        sessionStorage.setItem(
          "function_graph",
          JSON.stringify(data.function_graph),
        );
      if (data.state_graph)
        sessionStorage.setItem("state_graph", JSON.stringify(data.state_graph));

      navigate(
        `/graph-visualizer/${owner}/${repoName}?graphType=file&repo=${encodeURIComponent(fullRepo)}`,
      );
    } catch (err) {
      console.error("Analysis Error:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black text-gray-300 font-sans overflow-hidden selection:bg-cyan-500 selection:text-black">
      <DeveloperNavbar toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <DeveloperSidebar user={user} isOpen={isSidebarOpen} loading={!user} />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
          {/* Header Banner */}
          <header className="h-16 border-b border-white/5 flex items-center px-8 bg-black justify-between z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                <Globe size={16} />
              </div>
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white">
                  Public Repository Scanner
                </h2>
                <p className="text-[13px] text-gray-500 font-mono">
                  Compile architectural AST dependencies from public URLs
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 flex flex-col items-center justify-center bg-black relative">
            <div className="max-w-xl w-full mx-auto">
              <div className="border border-white/10 rounded-2xl bg-black p-8 shadow-xl relative overflow-hidden">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 text-cyan-400">
                    <Github size={22} />
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    Analyze Public Project
                  </h1>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Input a target repository link to initiate live graph
                    mapping.
                  </p>
                </div>

                <form onSubmit={handleAnalyze} className="space-y-4">
                  <div className="relative flex items-center bg-black border border-white/10 rounded-xl p-1.5 focus-within:border-cyan-500/50 transition-colors">
                    <div className="pl-3 text-gray-500">
                      <Globe size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="https://github.com/user/repo"
                      className="w-full bg-transparent border-none outline-none px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:ring-0"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Compiling Analysis...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Analysis</span>
                        <ArrowRight
                          size={14}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeProject;

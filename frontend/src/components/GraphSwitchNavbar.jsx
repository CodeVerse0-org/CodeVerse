import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const GraphSwitchNavbar = ({ repo, inst }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to determine if a route is currently active
  const isActive = (path) => location.pathname.includes(path);

  // Helper to safely navigate with query parameters intact
  const goTo = (path) => {
    const queryParams = new URLSearchParams();

    // Only append params if valid strings exist
    if (repo && repo !== "undefined" && repo !== "null") {
      queryParams.set("repo", repo);
    }
    if (inst && inst !== "undefined" && inst !== "null") {
      queryParams.set("inst", inst);
    }

    const queryString = queryParams.toString();
    const targetUrl = queryString ? `${path}?${queryString}` : path;
    
    navigate(targetUrl);
  };

  return (
    <div className="flex gap-2 bg-black/60 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
      {/* FILE GRAPH */}
      <button
        onClick={() => goTo("/visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/visualization") &&
          !isActive("/function") &&
          !isActive("/state") &&
          !isActive("/api")
            ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        FILE GRAPH
      </button>

      {/* FUNCTION GRAPH */}
      <button
        onClick={() => goTo("/function-visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/function-visualization")
            ? "bg-purple-500 text-black shadow-lg shadow-purple-500/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        FUNCTION GRAPH
      </button>

      {/* STATE GRAPH */}
      <button
        onClick={() => goTo("/state-visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/state-visualization")
            ? "bg-pink-500 text-black shadow-lg shadow-pink-500/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        STATE GRAPH
      </button>

      {/* API GRAPH */}
      <button
        onClick={() => goTo("/api-visualization")}
        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
          isActive("/api-visualization")
            ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/20"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        API GRAPH
      </button>
    </div>
  );
};

export default GraphSwitchNavbar;
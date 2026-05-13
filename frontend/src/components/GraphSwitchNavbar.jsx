import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function GraphSwitchNavbar({ repo, inst }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname.includes(path);

  const goTo = (path) => {
    navigate(`${path}?repo=${repo}&inst=${inst}`);
  };

  return (
    <div className="absolute top-4 right-6 z-50 flex gap-3 bg-black/40 p-2 rounded-xl border border-white/10 backdrop-blur-md">

      {/* FILE GRAPH */}
      <button
        onClick={() => goTo("/visualization")}
        className={`px-4 py-2 text-[10px] font-black rounded-lg transition ${
          isActive("/visualization")
            ? "bg-cyan-500 text-black"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        FILE GRAPH
      </button>

      {/* FUNCTION GRAPH */}
      <button
        onClick={() => goTo("/function-visualization")}
        className={`px-4 py-2 text-[10px] font-black rounded-lg transition ${
          isActive("/function-visualization")
            ? "bg-purple-500 text-black"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        FUNCTION GRAPH
      </button>

      {/* STATE GRAPH */}
      <button
        onClick={() => goTo("/state-visualization")}
        className={`px-4 py-2 text-[10px] font-black rounded-lg transition ${
          isActive("/state-visualization")
            ? "bg-pink-500 text-black"
            : "bg-white/5 text-gray-300 hover:bg-white/10"
        }`}
      >
        STATE GRAPH
      </button>

    </div>
  );
}
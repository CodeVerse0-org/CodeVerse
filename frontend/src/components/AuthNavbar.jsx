// AuthNavbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Terminal } from "lucide-react";

export const AuthNavbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="w-full px-6 lg:px-12 py-6 flex items-center justify-between relative z-20">
      <div
        onClick={() => navigate("/")}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)] group-hover:scale-110 transition-transform">
          <Terminal size={16} className="text-black fill-current" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-white text-sm tracking-[.15em] uppercase italic">
            CodeVerse
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-xs font-black font-mono text-gray-400 hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </nav>
  );
};

export default AuthNavbar;

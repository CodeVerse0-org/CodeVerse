import React from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react"; // Fixed: Added missing Box import

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="px-6 py-4 relative z-50"> {/* Increased padding slightly for better breathability */}
      <div className="flex items-center justify-between backdrop-blur-xl bg-black/40 border border-white/10 rounded-full px-6 py-2.5 shadow-2xl">
        
        {/* Logo Section */}
        <div className="flex items-center group cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 bg-[#209DB4] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(32,157,180,0.3)] group-hover:scale-110 transition-transform duration-300">
            <Box size={18} className="text-black fill-current" />
          </div>
          <div className="text-white font-black uppercase tracking-tighter text-lg ml-3 italic">
            Code<span className="text-[#209DB4]">Verse</span>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2 text-[11px] uppercase tracking-[0.2em] rounded-full bg-[#043736]/40 text-[#209DB4] font-black border border-[#209DB4]/30 hover:bg-[#209DB4] hover:text-black transition-all duration-300 active:scale-95 shadow-[0_0_15px_rgba(32,157,180,0.1)]"
        >
          Log In
        </button>
      </div>
    </header>
  );
};

export default Header;
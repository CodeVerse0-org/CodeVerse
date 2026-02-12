import React from "react";
import { Loader2 } from "lucide-react";

const GraphLoader = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] bg-[#010203]">
    {/* Subtle soft background glow */}
    <div className="absolute w-[300px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full" />

    <div className="relative flex items-center justify-center">
      {/* The main spinning element */}
      <Loader2 className="animate-spin text-cyan-400 relative z-10" size={42} strokeWidth={1.5} />
      
      {/* A static outer ring for "eye-catching" depth */}
      <div className="absolute inset-0 border-2 border-white/5 rounded-full scale-[1.6]" />
      <div className="absolute inset-0 border-t-2 border-cyan-500/40 rounded-full scale-[1.6] animate-[spin_4s_linear_infinite]" />
    </div>

    {/* Elegant Text */}
    <p className="text-white/80 font-medium tracking-[0.4em] text-[10px] uppercase mt-12">
      Generating Graph...
    </p>
    
    {/* Clean, slim loading bar */}
    <div className="mt-5 w-40 h-[1.5px] bg-white/5 rounded-full overflow-hidden relative">
      <div className="absolute top-0 h-full bg-cyan-500 animate-loading-bar" style={{ width: '35%' }} />
    </div>

    <style>{`
      @keyframes loading-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
      }
      .animate-loading-bar {
        animation: loading-bar 2s ease-in-out infinite;
      }
    `}</style>
  </div>
);

export default GraphLoader;
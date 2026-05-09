import React from "react";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-40 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-4xl mx-auto px-6"
      >
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
            Next-Gen Codebase Visualization
          </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
          AI-Powered <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#209DB4] via-cyan-300 to-[#209DB4]">
            Knowledge Graph
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Transform complex repositories into interactive visual maps. 
          Understand dependencies and logic flow in seconds, not hours.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button className="px-10 py-4 bg-[#209DB4] text-black font-black uppercase text-xs tracking-widest rounded-full hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(32,157,180,0.3)]">
            Start Mapping Now
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-32 pb-40 overflow-hidden text-center">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(32,157,180,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(32,157,180,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-4xl mx-auto px-6"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-block px-4 py-1.5 mb-6 rounded-full border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-md"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
            Codebase Visualization
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-8 leading-[1.1]"
        >
          AI-Powered Project <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#209DB4] via-cyan-400 to-[#209DB4] animate-gradient-x">
            Knowledge Graph
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
        >
          A smarter way to explore repositories—visual maps, AI summaries, and
          interactive insights that make complex projects clear within minutes.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <button 
            onClick={() => navigate("/login")}
            className="group relative px-8 py-4 bg-cyan-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-full hover:bg-white transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            Get Started for Free
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

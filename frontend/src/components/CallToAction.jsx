import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const CallToAction = () => {
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl mx-auto py-32 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1a1a] to-[#020405] border border-cyan-500/20 p-12 md:p-20 text-center shadow-[0_0_50px_rgba(6,182,212,0.1)]"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full" />

        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">
          Ready to see the <span className="text-[#209DB4]">Big Picture?</span>
        </h2>
        <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-lg">
          Join hundreds of developers visualizing their way to better code.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-12 py-5 bg-white text-black font-black uppercase text-sm tracking-widest rounded-full hover:bg-[#209DB4] transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer"
        >
          Get Started — It's Free
        </button>
      </motion.div>
    </section>
  );
};

export default CallToAction;

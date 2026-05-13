import React from "react";
import { motion } from "framer-motion";

const Step = ({ number, title, description, delay }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: false, amount: 0.3 }}
    transition={{ duration: 0.6, delay: delay }}
    className="relative group flex flex-col items-center text-center max-w-xs p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-500"
  >
    <div className="mb-6 w-16 h-16 flex items-center justify-center rounded-2xl bg-black border border-cyan-500/50 text-cyan-400 font-black text-2xl shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:shadow-cyan-500/40 group-hover:scale-110 transition-all duration-500">
      {number}
    </div>
    <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed font-medium">{description}</p>
    <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/10 group-hover:border-cyan-500/50 transition-colors" />
  </motion.div>
);

const HowItWorks = () => (
  <section className="relative max-w-7xl mx-auto px-6 py-32 overflow-hidden">
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false }}
      className="text-center mb-20"
    >
      <h2 className="text-xs font-black uppercase tracking-[0.5em] text-cyan-500 mb-4">The Workflow</h2>
      <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">How It <span className="text-cyan-500">Works</span></h2>
      <div className="w-20 h-1 bg-cyan-500 mx-auto mt-6 rounded-full opacity-50" />
    </motion.div>

    <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
      <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-12" />
      
      <Step number="1" title="Connect Repository" description="Securely link your GitHub repository in seconds." delay={0.1} />
      <Step number="2" title="AI Analyzes" description="Our engine maps every file, function, and dependency." delay={0.3} />
      <Step number="3" title="Explore Visualization" description="Navigate your project through an interactive graph." delay={0.5} />
    </div>
  </section>
);

export default HowItWorks;
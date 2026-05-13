import React from "react";
import { motion } from "framer-motion";

const CallToAction = () => (
  <section className="max-w-7xl mx-auto my-32 px-6">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false, amount: 0.5 }}
      transition={{ duration: 0.8 }}
      className="rounded-xl bg-gradient-to-r from-cyan-900/60 to-teal-900/60 border border-white/10 shadow-[0_0_60px_rgba(56,189,248,0.25)] text-center py-16 px-6"
    >
      <h2 className="text-3xl font-bold text-white mb-4">
        Ready to Transform Your Development Workflow?
      </h2>
      <p className="text-gray-300 mb-8 max-w-xl mx-auto">
        Stop guessing. Start seeing. Sign up for free and visualize your project in minutes.
      </p>
      <button className="bg-[#209DB4] text-black font-semibold px-6 py-3 rounded-full hover:bg-cyan-400 hover:scale-105 transition-all duration-300 font-black uppercase text-xs tracking-widest">
        Sign Up Now
      </button>
    </motion.div>
  </section>
);

export default CallToAction;
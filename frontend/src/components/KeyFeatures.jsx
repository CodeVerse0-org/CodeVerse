import React from "react";
import { motion } from "framer-motion";
import bulb from "../images/bulb.png";
import ships from "../images/ships.png";
import stars from "../images/stars.png";

const FeatureCard = ({ title, description, image, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false, margin: "-80px" }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    whileHover={{ scale: 1.04, y: -8 }}
    className="relative group overflow-hidden border border-white/10 rounded-2xl p-8 backdrop-blur-xl bg-gradient-to-b from-white/[0.04] to-black/40 hover:border-cyan-500/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all duration-500 text-left cursor-pointer flex flex-col justify-between"
    style={{ minHeight: "220px" }}
  >
    {/* Background Ambient Glow on Hover */}
    <div className="absolute -right-12 -top-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500 pointer-events-none" />

    <div>
      {/* Icon Container with Glow */}
      {image && (
        <div className="w-12 h-12 rounded-xl bg-black/60 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-500">
          <img src={image} alt={title} className="w-6 h-6 object-contain" />
        </div>
      )}

      <h3 className="text-white font-bold text-lg mb-2 tracking-tight group-hover:text-cyan-400 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-gray-400 text-sm leading-relaxed font-medium">
        {description}
      </p>
    </div>

    {/* Subtle Corner Accent */}
    <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/20 group-hover:border-cyan-400 transition-colors" />
  </motion.div>
);

const KeyFeatures = () => (
  <section className="max-w-7xl mx-auto px-6 py-28 text-center relative">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="mb-16"
    >
      <h2 className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500 mb-3">Core Capabilities</h2>
      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Key Features</h2>
      <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm md:text-base">
        Explore the advanced tools of CodeVerse designed to revolutionize repository navigation.
      </p>
    </motion.div>

    <div className="grid md:grid-cols-3 gap-8">
      <FeatureCard
        image={ships}
        title="AI-Powered Analysis"
        description="Automatically uncover hidden dependencies, bottlenecks, and complex architecture patterns."
        delay={0.1}
      />
      <FeatureCard
        image={stars}
        title="Visual Knowledge Graph"
        description="Understand your entire project ecosystem through a dynamic, fully interactive node graph."
        delay={0.2}
      />
      <FeatureCard
        image={bulb}
        title="Instant Code Insights"
        description="Identify potential design flaws and receive deep optimization summaries within seconds."
        delay={0.3}
      />
    </div>
  </section>
);

export default KeyFeatures;
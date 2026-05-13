import React from "react";
import { motion } from "framer-motion";
import bulb from "../images/bulb.png";
import ships from "../images/ships.png";
import stars from "../images/stars.png";

// FeatureCard component with the original text and new attractive styling
const FeatureCard = ({ title, description, image, bgColor, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false, amount: 0.2 }}
    transition={{ duration: 0.8, delay: delay, ease: [0.16, 1, 0.3, 1] }}
    whileHover={{ y: -10 }}
    className="relative group p-8 rounded-3xl border border-white/5 bg-[#0a0c10]/60 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300"
  >
    {/* Animated Glow Effect on Hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="absolute -inset-px border-2 border-transparent group-hover:border-cyan-500/20 rounded-3xl transition-colors duration-500" />

    {/* Content Container */}
    <div className="relative z-10 flex flex-col items-start gap-4">
      {/* Icon with subtle pulse glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center relative z-10 backdrop-blur-sm">
          {image && (
            <img 
              src={image} 
              alt={title} 
              className="w-6 h-6 object-contain filter brightness-110 group-hover:scale-110 transition-transform duration-300" 
            />
          )}
        </div>
      </div>

      {/* Text content using your exact original text */}
      <div className="text-left">
        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-cyan-400 transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* Decorative accent line */}
      <div className="w-8 h-1 bg-cyan-500/30 rounded-full group-hover:w-full transition-all duration-500" />
    </div>
  </motion.div>
);

const KeyFeatures = () => (
  <section className="max-w-7xl mx-auto px-6 py-24 text-center">
    {/* Section Header with original text */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      className="mb-16"
    >
      <h2 className="text-3xl font-bold text-white mb-3">Key Features</h2>
      <p className="text-gray-400 max-w-2xl mx-auto">
        Explore the core benefits of CodeVerse and how it revolutionizes development.
      </p>
    </motion.div>

    {/* Grid of feature cards */}
    <div className="grid md:grid-cols-3 gap-8">
      <FeatureCard
        image={ships}
        title="AI-Powered Analysis"
        description="Automatically uncover hidden dependencies and architecture patterns."
        bgColor="#262121"
        delay={0.1}
      />
      <FeatureCard
        image={stars}
        title="Visual Knowledge Graph"
        description="Understand your entire codebase through an interactive graph."
        bgColor="#262121"
        delay={0.2}
      />
      <FeatureCard
        image={bulb}
        title="Instant Insights"
        description="Identify design flaws and optimization opportunities instantly."
        bgColor="#262121"
        delay={0.3}
      />
    </div>
  </section>
);

export default KeyFeatures;
import React from "react";

const HeroSection = () => (
  <section className="relative pt-24 pb-32 overflow-hidden text-center">
    {/* Grid overlay with stronger visibility */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(58,170,204,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(58,170,204,0.15)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />

    {/* Subtle radial glow behind content */}
    <div className="absolute inset-0 flex justify-center items-center overflow-visible">
      <div className="w-[500px] h-[290px] bg-cyan-400/20 rounded-full filter blur-[150px]"></div>
    </div>

    {/* Hero content */}
    <div className="relative z-10 max-w-3xl mx-auto px-6">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100 mb-6">
        AI-Powered Project Knowledge Graph Visualization Tool
      </h1>

      <p className="text-gray-400 max-w-2xl mx-auto mb-10">
        A smarter way to explore repositories—visual maps, AI summaries, and
        interactive insights that make complex projects clear within minutes.
      </p>

      <button  onClick={() => navigate("/login")}
      className="bg-[#209DB4] text-black font-semibold px-8 py-3 rounded-md hover:bg-cyan-400 transition">
        Get Started for Free
      </button>
    </div>
  </section>
);

export default HeroSection;

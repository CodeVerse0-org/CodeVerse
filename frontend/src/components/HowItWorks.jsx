import React from "react";

// Single step component
const Step = ({ number, title, description }) => (
  <div className="text-center max-w-xs">
    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold text-xl shadow-[0_0_20px_rgba(56,189,248,0.4)]">
      {number}
    </div>
    <h3 className="text-white font-semibold mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

// HowItWorks section
const HowItWorks = () => (
  <section className="max-w-7xl mx-auto px-6 py-28 text-center">
    <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
    <p className="text-gray-400 mb-16">
      A simple 3-step process to unlock the power of your codebase.
    </p>

    <div className="flex flex-col md:flex-row justify-center gap-16">
      <Step
        number="1"
        title="Connect Repository"
        description="Securely link your GitHub repository in seconds."
      />
      <Step
        number="2"
        title="AI Analyzes"
        description="Our engine maps every file, function, and dependency."
      />
      <Step
        number="3"
        title="Explore Visualization"
        description="Navigate your project through an interactive graph."
      />
    </div>
  </section>
);

export default HowItWorks;

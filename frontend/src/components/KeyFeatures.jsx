import React from "react";
import bulb from "../images/bulb.png";
import ships from "../images/ships.png";
import stars from "../images/stars.png";

// FeatureCard component
const FeatureCard = ({ title, description, image, bgColor }) => (
  <div
    className="border border-white/10 rounded-xl p-6 hover:shadow-[0_0_30px_rgba(56,189,248,0.15)] transition flex items-start gap-3"
    style={{ backgroundColor: bgColor, minHeight: "150px" }} // increased height
  >
    {/* Image at top-left */}
    {image && <img src={image} alt={title} className="w-6 h-6 flex-shrink-0" />}

    {/* Text content */}
    <div className="text-left">
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  </div>
);

// KeyFeatures section
const KeyFeatures = () => (
  <section className="max-w-7xl mx-auto px-6 py-24 text-center">
    <h2 className="text-3xl font-bold text-white mb-3">Key Features</h2>
    <p className="text-gray-400 mb-14">
      Explore the core benefits of CodeVerse and how it revolutionizes development.
    </p>

    {/* Grid of feature cards */}
    <div className="grid md:grid-cols-3 gap-8">
      <FeatureCard
        image={ships}
        title="AI-Powered Analysis"
        description="Automatically uncover hidden dependencies and architecture patterns."
        bgColor="#262121"
      />
      <FeatureCard
        image={stars}
        title="Visual Knowledge Graph"
        description="Understand your entire codebase through an interactive graph."
        bgColor="#262121"
      />
      <FeatureCard
        image={bulb}
        title="Instant Insights"
        description="Identify design flaws and optimization opportunities instantly."
        bgColor="#262121"
      />
    </div>
  </section>
);

export default KeyFeatures;

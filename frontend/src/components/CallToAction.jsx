import React from "react";

const CallToAction = () => (
  <section className="max-w-7xl mx-auto my-32 px-6"> {/* increased max width */}
    <div className="rounded-xl bg-gradient-to-r from-cyan-900/60 to-teal-900/60 border border-white/10 shadow-[0_0_60px_rgba(56,189,248,0.25)] text-center py-16 px-6">
      <h2 className="text-3xl font-bold text-white mb-4">
        Ready to Transform Your Development Workflow?
      </h2>
      <p className="text-gray-300 mb-8 max-w-xl mx-auto">
        Stop guessing. Start seeing. Sign up for free and visualize your project in minutes.
      </p>
      <button className="bg-[#209DB4] text-black font-semibold px-4 py-2 rounded-md hover:bg-cyan-400 transition">
        Sign Up Now
      </button>
    </div>
  </section>
);

export default CallToAction;

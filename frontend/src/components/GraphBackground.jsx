import React from "react";
import { motion } from "framer-motion";

const GraphBackground = () => {
  // Creating 15 distinct nodes
  const nodes = Array.from({ length: 15 });

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020405]">
      {nodes.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            // Creating that "blurred ball" look
            width: Math.random() * 150 + 50 + "px",
            height: Math.random() * 150 + 50 + "px",
            background: `radial-gradient(circle, rgba(32,157,180,0.4) 0%, rgba(32,157,180,0) 70%)`,
            filter: "blur(20px)",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
          }}
          animate={{
            x: [0, Math.random() * 400 - 200, Math.random() * -400 + 200, 0],
            y: [0, Math.random() * 400 - 200, Math.random() * -400 + 200, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      
      {/* Subtle Grid overlay from your reference image_d43996.png */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(32,157,180,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(32,157,180,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
};

export default GraphBackground;
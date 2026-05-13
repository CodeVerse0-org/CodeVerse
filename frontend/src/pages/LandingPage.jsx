import React from "react";
import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import KeyFeatures from "../components/KeyFeatures";
import HowItWorks from "../components/HowItWorks";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";
import GraphBackground from "../components/GraphBackground";

const LandingPage = () => (
  <div className="min-h-screen bg-[#020405] text-gray-200 font-sans selection:bg-cyan-500 selection:text-black relative">
    {/* Bouncing blurred nodes background */}
    <GraphBackground />
    
    <div className="relative z-10">
      <Header />
      
      <main>
        <HeroSection />
        
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        <KeyFeatures />
        
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        <HowItWorks />
        
        <CallToAction />
      </main>

      <Footer />
    </div>

    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.1); }
      }
      .animate-pulse {
        animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `}</style>
  </div>
);

export default LandingPage;
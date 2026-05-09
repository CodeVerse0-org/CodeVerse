import React from "react";
import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import KeyFeatures from "../components/KeyFeatures";
import HowItWorks from "../components/HowItWorks";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";

const LandingPage = () => (
  <div className="min-h-screen bg-[#020405] text-gray-200 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
    {/* Background Ambient Glow */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-900/20 blur-[120px] rounded-full" />
      <div className="absolute top-[40%] -right-[10%] w-[30%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full" />
    </div>

    <Header />
    <main className="relative z-10">
      <HeroSection />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <KeyFeatures />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <HowItWorks />
      <CallToAction />
    </main>
    <Footer />
  </div>
);

export default LandingPage;
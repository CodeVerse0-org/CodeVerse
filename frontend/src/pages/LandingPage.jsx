import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import KeyFeatures from "../components/KeyFeatures";
import HowItWorks from "../components/HowItWorks";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";

const LandingPage = () => (
  <div className="min-h-screen bg-[#000000] font-sans">
    <Header />
    <HeroSection />
    <KeyFeatures />
    <HowItWorks />
    <CallToAction />
    <Footer />
  </div>
);

export default LandingPage;

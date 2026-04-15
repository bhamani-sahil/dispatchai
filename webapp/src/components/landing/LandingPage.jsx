import { useState } from "react";
import Navigation from "./Navigation";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import SocialProof from "./SocialProof";
import Industries from "./Industries";
import VoiceTeaser from "./VoiceTeaser";
import Pricing from "./Pricing";
import Footer from "./Footer";
import SignupModal from "./SignupModal";

export default function LandingPage() {
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <div className="relative min-h-screen" style={{ background: "linear-gradient(180deg, #F8F9FE 0%, #FFFFFF 30%, #FFFFFF 70%, #F8F9FE 100%)" }}>
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      <Navigation onSignup={() => setSignupOpen(true)} />
      <main>
        <Hero onSignup={() => setSignupOpen(true)} />
        <SocialProof />
        <HowItWorks />
        <Features />
        <Industries />
        <VoiceTeaser />
        <Pricing onSignup={() => setSignupOpen(true)} />
      </main>
      <Footer />

      <SignupModal isOpen={signupOpen} onClose={() => setSignupOpen(false)} />
    </div>
  );
}

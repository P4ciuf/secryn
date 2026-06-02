import { LandingNavbar } from "../components/landing/Navbar";
import { HeroSection } from "../components/landing/HeroSection";
import { WhySection } from "../components/landing/WhySection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { CTASection } from "../components/landing/CTASection";
import { LandingFooter } from "../components/landing/Footer";

/**
 * Public landing page that composes all marketing sections
 * into a single scrollable view.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <LandingNavbar />
      <HeroSection />
      <WhySection />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}

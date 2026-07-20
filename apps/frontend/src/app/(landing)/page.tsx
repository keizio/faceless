import { LandingNav } from "./_components/landing-nav";
import { HeroSection } from "./_components/hero-section";
import { FeaturesSection } from "./_components/features-section";
import { HowItWorksSection } from "./_components/how-it-works";
import { ShowcaseSection } from "./_components/showcase-section";
import { LandingFooter } from "./_components/landing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ShowcaseSection />
      <LandingFooter />
    </div>
  );
}
import { Faq } from "./components/Faq";
import { FeaturesCta } from "./components/FeaturesCta";
import { FlowSection } from "./components/FlowSection";
import { Hero } from "./components/Hero";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { VideoSection } from "./components/VideoSection";
import { AppMockup } from "./components/mockup/AppMockup";

// The template is a fixed 1440px canvas. The page keeps that width and
// centres itself so the layout stays pixel-identical to the Figma frame.
export default function LandingPage() {
  return (
    <div className="mx-auto w-[1440px]">
      <SiteHeader />
      <main>
        <Hero />
        <AppMockup />
        <FlowSection />
        <VideoSection />
        <FeaturesCta />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}

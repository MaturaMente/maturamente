import Hero from "./hero";
import { LandingTabsNotes } from "./tabs-notes";
import { LandingTabMaturità } from "./tabs-maturità";
import { Pit } from "./pit";
import Pricing from "./pricing";
import Faq from "./faq";
import Cta from "./cta";
import Footer from "./footer";
import { LandingNavbar } from "../shared/navigation/general-navbar";

export default function Landing() {
  return (
    <div>
      <div className="flex flex-col gap-24 md:gap-32 pt-8">
        <LandingNavbar />
        <Hero />
        <LandingTabsNotes />
        <LandingTabMaturità />
        <Pit />
        <Pricing />
        <Faq />
        <Cta />
        <Footer />
      </div>
    </div>
  );
}

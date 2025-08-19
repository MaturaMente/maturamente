import Hero from "./hero";
import { LandingTabs } from "./tabs";
import { Pit } from "./pit";
import Pricing from "./pricing";
import Faq from "./faq";
import Cta from "./cta";
import Footer from "./footer";
import { LandingNavbar } from "../shared/navigation/general-navbar";

export default function Landing() {
  return (
    <div>
      <div className="flex flex-col gap-16 md:gap-24 pt-8">
        <LandingNavbar />
        <Hero />
        <LandingTabs />
        <Pit />
        <Faq />
        <Cta />
        <Footer />
      </div>
    </div>
  );
}

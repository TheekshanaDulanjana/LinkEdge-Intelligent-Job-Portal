import CareerPath from "@/components/landing/careerpaths";
import CareerOpenings from "@/components/landing/featuredcareer";
import Hero from "@/components/landing/hero";
import Why from "@/components/landing/why";
import Faq from "@/components/landing/Faq";
import Cta from "@/components/landing/Cta";
import Feedback from "@/components/landing/Feedback";
import { getSiteContent } from "@/lib/siteContent";

// The text on this page is edited in the admin back-office, so it is read on every visit.
export const dynamic = "force-dynamic";

export default async function Home() {
  const c = await getSiteContent();
  return (
    <>
      <Hero content={c.hero} />
      <Why seekers={c.whySeekers} recruiters={c.whyRecruiters} />
      <CareerPath content={c.careerPaths} />
      <CareerOpenings />
      <Feedback content={c.testimonials} />
      <Faq content={c.faq} />
      <Cta />
    </>
  );
}

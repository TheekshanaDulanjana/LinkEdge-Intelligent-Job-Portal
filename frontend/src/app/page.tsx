import CareerPath from "@/components/landing/careerpaths";
import CareerOpenings from "@/components/landing/featuredcareer";
import Hero from "@/components/landing/hero";
import Why from "@/components/landing/why";
import Faq from "@/components/landing/Faq";
import Cta from "@/components/landing/Cta";
import Feedback from "@/components/landing/Feedback";


export default function Home() {
  return (
    <>
      <Hero />
      <Why />
      <CareerPath />
      <CareerOpenings />
      <Feedback />
      <Faq/>
      <Cta/>
    </>
  );
}
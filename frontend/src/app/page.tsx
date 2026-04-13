import CareerPath from "@/components/landing/careerpaths";
import CareerOpenings from "@/components/landing/featuredcareer";
import Hero from "@/components/landing/hero";
import Why from "@/components/landing/why";

export default function Home() {
  return (
    <>
      <Hero />
      <Why />
      <CareerPath />
      <CareerOpenings />
    </>
  );
}
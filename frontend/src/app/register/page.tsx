import RegisterHero from "@/components/auth/RegisterHero";
import RegisterSection from "@/components/auth/RegisterSection";

export default function LoginPage() {
  return (
    <main className="flex p-4 gap-4 min-h-screen">
      <RegisterSection />
      <RegisterHero />
    </main>
  );
}
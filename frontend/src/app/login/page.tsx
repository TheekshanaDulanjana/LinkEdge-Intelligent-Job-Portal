import AuthHeroSection from "@/components/auth/LoginHero";
import LoginFormSection from "@/components/auth/LoginSection";

export default function LoginPage() {
  return (
    <main className="flex p-4 gap-4 min-h-screen">
      <AuthHeroSection />
      <LoginFormSection />
    </main>
  );
}
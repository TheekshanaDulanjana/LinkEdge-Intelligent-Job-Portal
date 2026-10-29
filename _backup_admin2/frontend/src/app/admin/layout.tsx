import type { Metadata } from 'next';

// The admin console is never indexed.
export const metadata: Metadata = {
  title: 'SkillSync Admin',
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

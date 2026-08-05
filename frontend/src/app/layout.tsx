import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavigationHandler from '@/components/NavigationHandler';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter', 
});

export const metadata: Metadata = {
  title: "SkillSync - AI-Powered Job Matching Platform",
  description: "Find your dream job or hire top talent with our AI-powered platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <NavigationHandler />
        <main>{children}</main>
      </body>
    </html>
  );
}
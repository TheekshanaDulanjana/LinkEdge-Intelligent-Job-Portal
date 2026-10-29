import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavigationHandler from '@/components/NavigationHandler';
import Footer from '@/components/Footer';
import SmoothScroll from '@/components/SmoothScroll';
import SessionManager from '@/components/SessionManager';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter', 
});

export const metadata: Metadata = {
  title: "SkillSync - AI-Powered Job Matching Platform",
  description: "Find your dream job or hire top talent with our AI-powered platform",
  icons: {
    icon: '/TabIcon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased flex flex-col min-h-screen" suppressHydrationWarning>
        <SmoothScroll>
          <SessionManager />
          <NavigationHandler />
          <main className="flex-grow">{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
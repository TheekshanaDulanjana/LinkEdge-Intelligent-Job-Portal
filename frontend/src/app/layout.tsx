import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

// Display: swap දාන්න, එවිට font එක load වෙනකම් default එක පෙන්වනවා
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter', 
});

export const metadata: Metadata = {
  title: "LinkEdge - AI-Powered Job Matching Platform",
  description: "Find your dream job or hire top talent with our AI-powered platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
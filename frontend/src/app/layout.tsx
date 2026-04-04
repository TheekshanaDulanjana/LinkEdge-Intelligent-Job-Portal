import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "LinkEdge - AI-Powered Job Matching Platform",
  description: "Find your dream job or hire top talent with our AI-powered platform",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Add suppressHydrationWarning here
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}

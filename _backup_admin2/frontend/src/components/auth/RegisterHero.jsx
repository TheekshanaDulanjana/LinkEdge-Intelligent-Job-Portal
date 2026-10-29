'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterHero() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative hidden lg:flex flex-col rounded-[24px] justify-center items-start p-8 xl:p-12 text-white w-full lg:w-1/2 overflow-hidden shadow-2xl"
    >
      {/* Background with Grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4]">
        <div
          className="absolute inset-0 opacity-32"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0F9DE4 1px, transparent 1px),
              linear-gradient(to bottom, #0F9DE4 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
            maskImage: "linear-gradient(to bottom, #0F9DE4, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, white, transparent)",
          }}
        />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col items-start gap-8 w-full">
        {/* Logo, Title, and Description */}
        <div className="flex flex-col items-start">
          <Link href="/">
            <Image 
              src="/linkedge.png" 
              alt="LinkEdge Logo" 
              width={180} 
              height={40}
              style={{ width: 180, height: 'auto' }}
              className="mb-12 xl:mb-16" 
            />
          </Link>
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4 xl:mb-6 text-left">
            Beyond Job Searching.<br />
            Career Building.
          </h1>
          <p className="text-sm max-w-lg mb-6 xl:mb-8 text-left text-white/90 leading-relaxed">
            Step into a recruitment ecosystem that understands your potential. LinkEdge uses advanced AI to match your skills with the right roles, provides personalized growth paths, and automates your journey to the top.
          </p>

          <div className="flex gap-4">
            <Link href="/learn-more">
              <Button
                variant="outline"
                size="sm"
                border={true}
                hasBg={false}
                className="text-white bg-transparent backdrop-blur-xs w-[120px] border-white cursor-pointer hover:scale-105 transition-transform"
              >
                Learn More
              </Button>
            </Link>

            <Link href="/login">
              <Button
                variant="gradient"
                size="sm"
                className="border-2 border-white w-[120px] cursor-pointer hover:scale-105 transition-transform"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Career Path Card */}
        <div className="relative z-30 bg-white/95 backdrop-blur-md rounded-[16px] p-4 xl:p-5 shadow-2xl max-w-xl w-full">
          <h4 className="text-black font-semibold mb-3 text-sm xl:text-base">
            Career Paths
          </h4>

          <div className="flex flex-wrap justify-start gap-2 xl:gap-3">
            {[
              "Software Engineer",
              "AI/ML Engineer",
              "Full Stack Developer",
              "UI/UX Designer",
              "DevOps",
              "Digital Marketer",
              "Cloud Engineer",
              "Data Scientist",
              "QA Analyst",
              "Product Manager",
              "Data Engineer",
              "Cybersecurity Analyst",
              "Business Analyst",
            ].map((item) => (
              <span
                key={item}
                className="relative text-xs px-3 py-1 bg-transparent"
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='url(%23g)' stroke-width='1.5' stroke-dasharray='4%2c 3' stroke-dashoffset='0' stroke-linecap='square'/%3e%3cdefs%3e%3clinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3e%3cstop offset='0%25' stop-color='%230F9DE4'/%3e%3cstop offset='100%25' stop-color='%230025B8'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e")`,
                    borderRadius: "6px",
                  }}
                />
                <span className="relative z-10 text-gray-700 font-medium">
                  {item}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
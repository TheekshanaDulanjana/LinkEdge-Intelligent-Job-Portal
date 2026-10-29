'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  search?: string;
  setSearch?: (val: string) => void;
  location?: string;
  setLocation?: (val: string) => void;
  handleSearch?: () => void;
}

export default function ProfileHeroSection({ search, setSearch, location, setLocation, handleSearch }: HeroSectionProps) {
  return (
    <div className="relative w-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-20 md:py-28 text-center text-white overflow-hidden shadow-xl">
      
      {/* Moving Grid Pattern (Matching your website's main Hero style) */}
      <motion.div
        animate={{
          backgroundPosition: ["0px 0px", "64px 64px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 opacity-35 pointer-events-none"
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

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Animated Heading */}
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 mt-8 tracking-tight"
        >
          User Profile
        </motion.h1>

        {/* Animated Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium"
        >
          View and update your personal details, keep your professional information up to date, and track all your job applications in one place.
        </motion.p>
        
      </div>
    </div>
  );
}
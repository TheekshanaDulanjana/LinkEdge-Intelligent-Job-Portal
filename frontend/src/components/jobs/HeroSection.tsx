'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';

interface HeroSectionProps {
  search: string;
  setSearch: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  handleSearch: () => void;
  total: number;
}

export default function HeroSection({ search, setSearch, location, setLocation, handleSearch, total }: HeroSectionProps) {
  return (
    <div className="relative w-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-20 md:py-28 text-center text-white overflow-hidden shadow-xl">
      
      {/* Moving Grid Pattern */}
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
          Explore Opportunities
        </motion.h1>

        {/* Animated Subtitle with Dynamic Live Count */}
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Browse through <span className="font-medium ">{total}+</span> active vacancies and find the role that perfectly aligns with your career path.
        </motion.p>
        
        {/* Search Bar Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white p-1 rounded-3xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto border border-white/20"
        >
          <div className="flex items-center flex-1 w-full px-3 py-1.5 md:border-r border-gray-100">
            <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
            <Input
              placeholder="Job Title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-none text-gray-900 focus-visible:ring-0 placeholder:text-gray-400 bg-transparent shadow-none"
            />
          </div>

          <div className="flex items-center flex-1 w-full px-3 py-1.5">
            <MapPin className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border-none text-gray-900 focus-visible:ring-0 placeholder:text-gray-400 bg-transparent shadow-none"
            />
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full md:w-auto">
            <Button 
              onClick={handleSearch} 
              variant="gradient"
              className="w-full md:w-auto text-white px-10 rounded-2xl md:rounded-full h-12 cursor-pointer font-semibold shadow-md"
            >
              Search
            </Button>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
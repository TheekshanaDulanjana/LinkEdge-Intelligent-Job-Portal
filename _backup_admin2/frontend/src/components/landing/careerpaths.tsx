"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CareerPathsContent } from "@/lib/siteContent";

export default function CareerPath({ content }: { content: CareerPathsContent }) {
  const JOBS = content.paths;
  return (
    <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 text-center font-sans overflow-hidden bg-white">
      
      {/* Left & Right White-to-Transparent Gradient Overlays */}
      <div className="absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          <span className="inline-block text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3 py-1 rounded-full border border-sky-100 shadow-sm">
            {content.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            {content.title}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {content.description}
          </p>
        </motion.div>

        {/* Jobs Pills Grid with Floating & Staggered Motion */}
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.04
              }
            }
          }}
          className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-6 max-w-6xl mx-auto"
        >
          {JOBS.map((job, idx) => {
            // Generate unique organic float patterns per pill using index offsets
            const randomDuration = 4 + (idx % 3) * 1.5; 
            const randomYOffset = (idx % 2 === 0 ? 1 : -1) * (6 + (idx % 4) * 3);

            return (
              <motion.div 
                key={job} 
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 15 },
                  show: { opacity: 1, scale: 1, y: 0 }
                }}
                animate={{
                  y: [0, randomYOffset, 0],
                  x: [0, (idx % 2 === 0 ? 3 : -3), 0],
                }}
                transition={{
                  y: {
                    duration: randomDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: idx * 0.1,
                  },
                  x: {
                    duration: randomDuration * 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: idx * 0.15,
                  }
                }}
                whileHover={{ scale: 1.1, y: -6, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
              >
                <Link href={`/jobs?search=${encodeURIComponent(job)}`} aria-label={`Search ${job} jobs`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F9DE4]">
                {/* Thin Dashed Border Layer */}
                <div 
                  className="absolute inset-0 rounded-xl border border-dashed border-[#0F9DE4]/70 group-hover:border-[#0025B8] group-hover:bg-[#0F9DE4]/5 transition-colors pointer-events-none shadow-xs"
                />
                
                {/* Inner Text Layer */}
                <div className="relative px-5 py-2.5 sm:px-6 sm:py-3 text-[#0025B8] font-semibold text-xs sm:text-sm rounded-xl transition-colors">
                  {job}
                </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
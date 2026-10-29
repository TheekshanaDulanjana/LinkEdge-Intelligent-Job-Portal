"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full my-12">
      <section className="relative rounded-2xl md:rounded-3xl w-full overflow-hidden shadow-2xl py-20 lg:py-12 flex items-center justify-center text-center">
        
        {/* Background Gradient & Moving Grid Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4]">
          
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
            className="absolute inset-0 opacity-35"
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

        {/* Content Container */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center justify-center space-y-6">
          
          {/* Tag */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-transparent border border-white/35 tracking-widest px-4 py-1 text-xs text-white shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shrink-0" />
            <span>THE INTELLIGENT RECRUITMENT ECOSYSTEM</span>
          </motion.div>

          {/* Extended Heading */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl sm:text-2xl lg:text-4xl font-bold text-white tracking-tight leading-tight max-w-4xl"
          >
            What&apos;s your next move? 
            Transform your future today.
          </motion.h2>

          {/* Extended Description */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-white/90 text-base sm:text-base max-w-3xl mx-auto leading-relaxed font-medium"
          >
            The right job, or the right hire. Both start here. Experience a unified AI-driven portal engineered to match extraordinary talent with world-class opportunities seamlessly.
          </motion.p>

          {/* Fully Rounded Pill Buttons with Links */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            {/* Primary Button: Find Job */}
            <Link href="/jobs" className="w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                <Button
                  variant="gradient"
                  size="md"
                  className="border-2 border-white cursor-pointer shadow-lg hover:shadow-cyan-500/35 transition-all w-full sm:w-44 rounded-full font-semibold h-12 text-sm sm:text-base"
                >
                  Find Job
                </Button>
              </motion.div>
            </Link>

            {/* Secondary Button: Start Hiring */}
            <Link href="/register?role=company" className="w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                <Button
                  variant="outline"
                  size="md"
                  border={true}
                  hasBg={false}
                  className="text-white bg-transparent border-white cursor-pointer hover:bg-white/10 transition-all w-full sm:w-44 rounded-full font-semibold h-12 text-sm sm:text-base"
                >
                  Start Hiring
                </Button>
              </motion.div>
            </Link>
          </motion.div>

        </div>

      </section>
    </div>
  );
}
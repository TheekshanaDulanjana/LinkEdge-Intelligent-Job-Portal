'use client';

import React from 'react';
import { motion } from 'framer-motion';

/** Blue banner used at the top of the Overview, For Job Seekers and For Companies pages. */
export default function PageHero({ tag, title, description }: { tag: string; title: string; description: string }) {
  return (
    <header className="bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white pt-32 pb-16 sm:pt-36 sm:pb-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          className="text-[0.8125rem] font-semibold uppercase tracking-[0.07em] text-sky-100">
          {tag}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-3 text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] leading-[1.1] tracking-[-0.025em] font-semibold">
          {title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-5 text-[1.0625rem] leading-relaxed text-white/85 max-w-2xl mx-auto">
          {description}
        </motion.p>
      </div>
    </header>
  );
}

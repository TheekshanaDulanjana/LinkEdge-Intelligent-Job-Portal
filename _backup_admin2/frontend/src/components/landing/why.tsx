'use client';

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { iconFor } from "./icons";
import type { WhyContent } from "@/lib/siteContent";
import { Button } from "@/components/ui/button";

export default function LinkEdgeLanding({ seekers, recruiters }: { seekers: WhyContent; recruiters: WhyContent }) {
  const SECTIONS = [
    { ...seekers, className: "" },
    { ...recruiters, className: "md:pl-10 lg:pl-16" },
  ];
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 relative items-stretch">

        {/* Center Animated Divider for Desktop */}
        <div className="hidden md:block absolute left-1/2 inset-y-0 w-px border-l-2 border-dashed border-[#0F9DE4]/30 -translate-x-1/2" />

        {SECTIONS.map((sec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.2 }}
            className={`flex flex-col justify-between space-y-8 bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl hover:shadow-2xl transition-shadow ${sec.className || ""}`}
          >
            {/* Top Section */}
            <div className="space-y-8">
              {/* Header */}
              <header className="space-y-2">
                <span className="inline-block text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                  {sec.tag}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {sec.title}
                </h2>
              </header>

              {/* Features List */}
              <div className="space-y-6">
 {sec.features.map((f, j) => {
                  const Icon = iconFor(f.icon);
                  return (
                  <motion.div 
                    key={j} 
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex gap-4 sm:gap-5 items-start p-3 rounded-2xl hover:bg-white/80 transition-colors"
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-[#0F9DE4]/10 flex items-center justify-center shadow-inner">
                      <Icon className="w-5 h-5 text-[#0F9DE4]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-gray-900">
                        {f.title}
                      </h4>
                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 w-full">
              <Link href={sec.learnMoreUrl} className="flex-1 sm:flex-none">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    border={true}
                    hasBg={false}
                    className="text-[#0F9DE4] border-[#0F9DE4] w-full sm:w-28 cursor-pointer hover:bg-sky-50 transition-all font-medium h-10 rounded-full"
                  >
                    Learn more
                  </Button>
                </motion.div>
              </Link>

              <Link href={sec.registerUrl} className="flex-1 sm:flex-none">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="cursor-pointer w-full sm:w-28 shadow-md hover:shadow-lg transition-all font-medium h-10 rounded-full"
                  >
                    Register
                  </Button>
                </motion.div>
              </Link>
            </div>

          </motion.div>
        ))}

      </div>
    </section>
  );
}
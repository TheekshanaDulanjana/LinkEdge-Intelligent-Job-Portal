'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SidebarFilters() {
  const sections = [
    { title: "Work Type", options: ["Full Time", "Part Time", "Contract", "Internship"] },
    { title: "AI Match Score", options: ["High Match", "Moderate Match", "Show All"] },
    { title: "Work Environment", options: ["On-site", "Remote", "Hybrid"] },
    { title: "Sort By", options: ["Most Recent", "Highest Salary", "Best AI Match"] },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-white/80 backdrop-blur-xl p-6 rounded-[24px] border border-sky-100 shadow-xl"
    >
      <h3 className="font-bold text-slate-900 mb-6 pb-3 border-b border-sky-100 tracking-tight text-base flex items-center justify-between">
        <span>Refine Your Search</span>
        <span className="w-2 h-2 rounded-full bg-[#0F9DE4] animate-pulse" />
      </h3>

      {sections.map((sec, idx) => (
        <motion.div 
          key={sec.title} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
          className="mb-6 last:mb-0"
        >
          <p className="text-xs font-bold text-[#0025B8] mb-3 uppercase tracking-wider">
            {sec.title}
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {sec.options.map((opt) => (
              <motion.div 
                key={opt} 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-sky-50/60 transition-colors"
              >
                <Checkbox
                  id={opt}
                  className="border-slate-300 rounded-md data-[state=checked]:bg-[#0025B8] data-[state=checked]:border-[#0025B8]"
                />
                <Label
                  htmlFor={opt}
                  className="text-xs text-slate-700 font-medium cursor-pointer leading-none"
                >
                  {opt}
                </Label>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
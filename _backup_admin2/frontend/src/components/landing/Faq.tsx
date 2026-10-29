'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, HeartHandshake, Sparkles } from 'lucide-react';
import type { FaqContent } from '@/lib/siteContent';

export default function FAQSection({ content }: { content: FaqContent }) {
  const FAQ_QUESTIONS = content.items;
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="relative w-full py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-sky-50/30 to-white overflow-hidden font-sans">
      
      {/* Background Decorative Gradient Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0F9DE4]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3 max-w-3xl mx-auto"
        >
          <span className="inline-block text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-sm">
            {content.tag}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {content.title}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {content.description}
          </p>
        </motion.div>

        {/* 2-Column Main Layout (Left: Q&A, Right: Simple & Friendly Highlight Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT SIDE: FAQ Accordion List (7 Columns) */}
          <div className="lg:col-span-7 space-y-4">
            {FAQ_QUESTIONS.map((faq, index) => {
              const isOpen = activeIndex === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-sky-100 shadow-md hover:shadow-lg transition-all overflow-hidden"
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex justify-between items-center p-5 sm:p-6 text-left cursor-pointer focus:outline-none group"
                  >
                    <span className={`text-base sm:text-lg font-semibold transition-colors ${isOpen ? 'text-[#0F9DE4]' : 'text-slate-900 group-hover:text-[#0F9DE4]'}`}>
                      {faq.question}
                    </span>
                    
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#0F9DE4] text-white shadow-md' : 'bg-sky-50 text-[#0F9DE4]'}`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-5 pb-6 sm:px-6 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-sky-50 pt-3 font-medium">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* RIGHT SIDE: Simple, Clear & Friendly Highlights (5 Columns) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            
            {/* Primary Highlight Card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden border border-white/20"
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, white 1px, transparent 1px),
                    linear-gradient(to bottom, white 1px, transparent 1px)
                  `,
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                    <Sparkles className="w-6 h-6 text-cyan-200" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-white/20">
                    Simple & Easy
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">Built for Everyone</h3>
                  <p className="text-white/90 text-sm leading-relaxed font-medium">
                    Whether you are taking your first career step or hiring your next star team member, SkillSync makes the entire journey smooth and stress-free.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                    <CheckCircle2 className="w-5 h-5 text-cyan-200 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold">100% Free for Job Seekers</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                    <CheckCircle2 className="w-5 h-5 text-cyan-200 shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold">Quick & Easy Profile Setup</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Secondary Support Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white/90 backdrop-blur-xl rounded-2xl border border-sky-100 p-5 shadow-lg flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F9DE4] shrink-0 shadow-xs">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Friendly Support</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Here when you need help</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white/90 backdrop-blur-xl rounded-2xl border border-sky-100 p-5 shadow-lg flex items-center gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F9DE4] shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Trusted Platform</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Safe and reliable</p>
                </div>
              </motion.div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
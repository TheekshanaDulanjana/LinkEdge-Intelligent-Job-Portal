'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Sparkles } from 'lucide-react';

const TESTIMONIALS = [
  {
    role: "JOB SEEKER",
    name: "Akindu Perera",
    title: "Software Engineer at Virtusa",
    quote: "I got my tech job on SkillSync through AI matching in just a few days! The platform read my CV instantly and matched my exact skills.",
    accentColor: "from-[#0025B8] to-[#0F9DE4]"
  },
  {
    role: "RECRUITER",
    name: "Chamathka Silva",
    title: "Head of HR, TechCorp Solutions",
    quote: "Half of the high-quality hires we made this quarter came from SkillSync. The automated candidate ranking saves our HR team hours of manual screening.",
    accentColor: "from-[#0F9DE4] to-cyan-400"
  },
  {
    role: "JOB SEEKER",
    name: "Sanduni Fernando",
    title: "UI/UX Designer",
    quote: "The AI Interview practice gave me the real confidence I needed. Getting instant feedback on my responses changed everything for my career.",
    accentColor: "from-[#0025B8] to-[#0F9DE4]"
  },
  {
    role: "RECRUITER",
    name: "Nuwan Jayasinghe",
    title: "Tech Lead & Hiring Manager",
    quote: "I can't imagine our recruitment process without SkillSync anymore. It bridges the gap between top talent and fast-growing companies seamlessly.",
    accentColor: "from-[#0F9DE4] to-blue-600"
  }
];

export default function TestimonialsSection() {
  return (
    <section className="relative w-full py-28 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden bg-gradient-to-b from-white via-sky-50/40 to-white">
      
      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-sky-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-200/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-20">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-4 py-1.5 rounded-full border border-sky-100 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>COMMUNITY SUCCESS STORIES</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Careers found. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0025B8] to-[#0F9DE4]">
              Teams built.
            </span>
          </h2>
          
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Real experiences from professionals who transformed their hiring and job hunting journey with SkillSync.
          </p>
        </motion.div>

        {/* Unique Asymmetric Grid Layout with Smooth Hover Motion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 items-center">
          {TESTIMONIALS.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.15 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className={`relative p-8 sm:p-10 rounded-[2rem] bg-white/80 backdrop-blur-xl border border-sky-100 shadow-xl hover:shadow-2xl transition-all duration-300 group ${
                index % 2 === 1 ? 'md:translate-y-6' : ''
              }`}
            >
              {/* Top accent glow line */}
              <div className={`absolute top-0 left-8 right-8 h-1 rounded-full bg-gradient-to-r ${item.accentColor} opacity-70`} />

              <div className="space-y-6">
                
                {/* Role Badge & Quote Icon */}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full bg-sky-50 text-[#0F9DE4] border border-sky-100">
                    {item.role}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0F9DE4] group-hover:bg-[#0F9DE4] group-hover:text-white transition-colors duration-300">
                    <Quote className="w-5 h-5 rotate-180" />
                  </div>
                </div>

                {/* Quote Text */}
                <p className="text-slate-800 text-base sm:text-lg font-medium leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>

                {/* Author Info */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-semibold text-sm">{item.name}</h4>
                    <p className="text-slate-500 text-xs">{item.title}</p>
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
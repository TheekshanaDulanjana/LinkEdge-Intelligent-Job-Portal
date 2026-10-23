'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, Video, FileText, TrendingUp, Award } from 'lucide-react';
import CTASection from '@/components/landing/Cta';

export default function ForJobSeekersPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans">
      
      {/* Hero Section matching Jobs page style */}
      <div className="relative w-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-24 md:py-32 text-center text-white overflow-hidden shadow-xl">
        <motion.div
          animate={{ backgroundPosition: ["0px 0px", "64px 64px"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #0F9DE4 1px, transparent 1px), linear-gradient(to bottom, #0F9DE4 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            maskImage: "linear-gradient(to bottom, #0F9DE4, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, white, transparent)",
          }}
        />

        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold border border-white/20 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>For Ambitious Professionals</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
          >
            Supercharge Your Career with AI Insights
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Discover roles tailored to your exact skills, practice interviews with real-time AI feedback, and close skill gaps faster than ever.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        
        {/* Benefit Section 1: Smart Resume Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="text-xs font-bold tracking-wider text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              01. Intelligent Matching
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Never wonder why you weren't called for an interview
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Our Smart Apply and CV Analyzer scans your resume against thousands of active job requirements, providing exact match percentages and identifying missing skill gaps instantly.
            </p>
            <ul className="space-y-3">
              {[
                "Automated skill extraction and categorization",
                "Instant compatibility scoring per position",
                "Actionable recommendations to boost interview callbacks",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <div className="relative h-80 sm:h-96 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
            <Image src="/test.png" alt="Smart Resume Analysis" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>
        </div>

        {/* Benefit Section 2: AI Interview Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-80 sm:h-96 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white order-2 lg:order-1">
            <Image src="/test.png" alt="AI Interview Simulator" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6 order-1 lg:order-2"
          >
            <span className="text-xs font-bold tracking-wider text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              02. Interview Mastery
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Practice under real conditions and eliminate anxiety
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Got shortlisted for an interview? Use our AI Interview Simulator to practice role-specific questions. Get immediate feedback on tone, clarity, and depth before facing real hiring managers.
            </p>
            <ul className="space-y-3">
              {[
                "Role-specific mock interview sessions",
                "Real-time evaluation and scoring metrics",
                "Confidence-building constructive feedback",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Benefit Section 3: Tailored Growth & Learning */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="text-xs font-bold tracking-wider text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              03. Continuous Growth
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Bridge your skill gaps with curated learning paths
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              When target roles require competencies you haven't mastered yet, SkillSync points you directly to recommended courses from top platforms so you can upskill rapidly.
            </p>
            <ul className="space-y-3">
              {[
                "Automated skill gap identification",
                "Direct links to top-rated online courses",
                "Track progress as you acquire new competencies",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <div className="relative h-80 sm:h-96 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
            <Image src="/test.png" alt="Skill Gap Bridging" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>
        </div>

      </div>

      {/* Replaced old CTA with shared CTASection */}
      <CTASection />
    </div>
  );
}
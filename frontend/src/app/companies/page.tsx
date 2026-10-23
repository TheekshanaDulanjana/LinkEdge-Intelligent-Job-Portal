'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, ShieldCheck, Users, BarChart3, Zap } from 'lucide-react';
import CTASection from '@/components/landing/Cta';

export default function ForCompaniesPage() {
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
            <span>For Enterprises & Recruiters</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
          >
            Scale Your Hiring Pipeline with AI Intelligence
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Automate applicant screening, rank incoming talent instantly based on job descriptions, and secure top-tier professionals faster.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        
        {/* Company Benefit Section 1: Automated Screening */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="text-xs font-bold tracking-wider text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              01. Automated Screening
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Cut resume review time by 75% with semantic ranking
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Stop manually sorting through hundreds of unqualified applications. SkillSync automatically evaluates incoming resumes and ranks candidates from highest to lowest suitability for each vacancy.
            </p>
            <ul className="space-y-3">
              {[
                "Automated ATS scoring and suitability sorting",
                "Instant identification of top-tier matching candidates",
                "Elimination of manual resume bottlenecking",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <div className="relative h-80 sm:h-96 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
            <Image src="/test.png" alt="Automated Screening" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>
        </div>

        {/* Company Benefit Section 2: Complete Dashboard Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-80 sm:h-96 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white order-2 lg:order-1">
            <Image src="/test.png" alt="Dashboard Management" fill className="object-cover" priority />
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
              02. Centralized Hub
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Manage postings, applicants, and interviews in one dashboard
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Our intuitive company portal gives your HR team complete control over active vacancies, applicant status updates, rejection notes, and interview schedules.
            </p>
            <ul className="space-y-3">
              {[
                "Dedicated job vacancy creation and management",
                "Seamless applicant status tracking and feedback notes",
                "Direct interview scheduling and venue coordination",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Company Benefit Section 3: Verified Candidate Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="text-xs font-bold tracking-wider text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              03. Verified Talent
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Make confident hiring decisions backed by verified data
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Access rich candidate profiles complete with verified portfolio links, GitHub repositories, Behance showcases, and structured core competencies.
            </p>
            <ul className="space-y-3">
              {[
                "Access to pre-screened professional profiles",
                "Direct visibility into candidate portfolios & code repositories",
                "High-confidence hiring with reduced onboarding risk",
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <div className="relative h-80 sm:h-96 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
            <Image src="/test.png" alt="Verified Talent" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>
        </div>

      </div>

      {/* Replaced old CTA with shared CTASection */}
      <CTASection />
    </div>
  );
}
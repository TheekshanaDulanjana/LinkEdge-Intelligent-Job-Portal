'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Target, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Briefcase, 
  FileCheck, 
  Headphones,
  Zap,
  Globe2,
  Award,
  Layers,
  Compass,
  Building2,
  Users2,
  TrendingUp,
  Terminal,
  Activity
} from 'lucide-react';
import CTASection from '@/components/landing/Cta';
import type { OverviewContent } from '@/lib/siteContent';

export default function OverviewClient({ content }: { content: OverviewContent }) {
  const [activeTab, setActiveTab] = useState<'talent' | 'enterprise'>('talent');

  return (
    <div className="min-h-screen bg-[#Fcfdfd] text-slate-900 font-sans selection:bg-sky-100 selection:text-[#0025B8]">
      
      {/* 1. HERO SECTION */}
      <div className="relative w-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-24 md:py-36 text-center text-white overflow-hidden shadow-2xl">
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
        <div className="max-w-4xl mx-auto relative z-10 space-y-5">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold border border-white/20 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>{content.hero.badge}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
          >
            {content.hero.title}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {content.hero.description}
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-36">
        
        {/* SECTION 2: ABOUT US & MARKET METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 space-y-6"
          >
            <span className="text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              {content.about.tag}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {content.about.title}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              {content.about.body}
            </p>
          </motion.div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {content.about.stats.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-sky-500/5 space-y-3 hover:border-sky-200 transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0F9DE4]">
                  {React.createElement([Compass, Award, Users2, TrendingUp][i % 4], { className: "w-5 h-5" })}
                </div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{item.stat}</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SECTION 3: TRUSTED ECOSYSTEM PARTNERS */}
        <div className="text-center space-y-8 bg-slate-50/80 border border-slate-100 rounded-[36px] p-8 sm:p-12 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{content.partners.label}</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 opacity-80">
            {content.partners.names.map((brand, i) => (
              <div key={i} className="flex items-center gap-2.5 font-bold text-slate-700 text-base sm:text-lg tracking-tight">
                <div className="w-3 h-3 rounded-full bg-[#0F9DE4]" />
                <span>{brand}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: CORE CAPABILITIES CATALOG */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              {content.capabilities.tag}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {content.capabilities.title}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              {content.capabilities.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.capabilities.items.map((it) => ({ title: it.title, desc: it.description, tag: it.tag, image: "/test.png" })).map((cat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-xl shadow-sky-500/5 group flex flex-col justify-between"
              >
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <Image src={cat.image} alt={cat.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <span className="absolute top-4 left-4 text-[10px] font-bold text-white uppercase bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                    {cat.tag}
                  </span>
                </div>
                <div className="p-7 space-y-3">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#0F9DE4] transition-colors">{cat.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">{cat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SECTION 5: HOW WE WORK (Step-by-step workflow with full-height portrait image matching cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          
          {/* Left Side: Portrait Image stretched cleanly to match right cards height */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <span className="text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
                {content.workflow.tag}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {content.workflow.title}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
                {content.workflow.description}
              </p>
            </div>

            <div className="relative flex-1 min-h-[420px] rounded-[32px] overflow-hidden shadow-2xl border-4 border-slate-100 hidden lg:block">
              <Image src="/test.png" alt="Workflow Portrait" fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
              
            </div>
          </motion.div>

          {/* Right Side: Step Cards aligned right to the top title */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {[
              {
                icon: Headphones,
                step: "Phase 01",
                title: "Initial Consultation & Intake",
                desc: "We analyze your hiring requisitions or professional career targets to establish exact benchmarks."
              },
              {
                icon: Search,
                step: "Phase 02",
                title: "Algorithmic Sourcing & Vetting",
                desc: "Our neural engine parses repositories and candidate databases to extract top-tier matches."
              },
              {
                icon: Briefcase,
                step: "Phase 03",
                title: "Evaluation & Interview Simulation",
                desc: "Candidates undergo structured AI evaluations and mock practice sessions for role readiness."
              },
              {
                icon: FileCheck,
                step: "Phase 04",
                title: "Credential & Compliance Check",
                desc: "Thorough validation of portfolios, work history, references, and technical credentials."
              },
              {
                icon: ShieldCheck,
                step: "Phase 05",
                title: "Onboarding & Transaction Support",
                desc: "End-to-end support in finalizing offers, contract execution, and team integration."
              },
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="flex items-start gap-4 p-5 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0025B8] flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#0F9DE4] uppercase tracking-wider">{step.step}</span>
                  <h3 className="font-bold text-slate-900 text-base">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* SECTION 6: INTERACTIVE SEGMENTED VALUE PROPOSITION (For Talent vs For Enterprise) */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-xs">
              {content.impact.tag}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {content.impact.title}
            </h2>

            {/* Segment Toggle Buttons */}
            <div className="inline-flex bg-slate-100 p-1.5 rounded-full mt-4">
              <button
                onClick={() => setActiveTab('talent')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'talent' 
                    ? 'bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Job Seekers & Talent
              </button>
              <button
                onClick={() => setActiveTab('enterprise')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'enterprise' 
                    ? 'bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Companies & Recruiters
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'talent' ? (
              <motion.div
                key="talent"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {[
                  { title: "100% Free Access", desc: "Create profiles, scan resumes, and practice mock interviews at zero cost." },
                  { title: "Real-time AI Feedback", desc: "Know exactly how your answers score and improve before talking to recruiters." },
                  { title: "Curated Growth Paths", desc: "Receive automated recommendations on missing skills with direct course links." },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[28px] border border-sky-100 shadow-xl space-y-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="enterprise"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {[
                  { title: "Automated Applicant Ranking", desc: "Save hours by letting our ATS sort incoming talent by exact relevance score." },
                  { title: "Centralized HR Hub", desc: "Manage postings, interview venues, application statuses, and notes in one place." },
                  { title: "Verified Portfolios", desc: "Review genuine GitHub, Behance, and verified project records prior to interviews." },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[28px] border border-sky-100 shadow-xl space-y-3">
                    <ShieldCheck className="w-8 h-8 text-[#0F9DE4]" />
                    <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      

        {/* SECTION 8: FINAL VISION & QUOTE BANNER */}
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-4">
          <div className="w-12 h-12 rounded-full bg-sky-50 text-[#0025B8] flex items-center justify-center mx-auto shadow-sm">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            &ldquo;Building the intelligent bridge where exceptional careers and elite companies meet.&rdquo;
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">— The SkillSync Engineering & Product Team</p>
        </div>

      </div>

      {/* Shared CTASection */}
      <CTASection />
    </div>
  );
}
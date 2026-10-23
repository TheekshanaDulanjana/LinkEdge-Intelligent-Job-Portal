'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, CheckCircle2 } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans">
      
      {/* Hero Section matching Jobs page style */}
      <div className="relative w-full bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] px-4 py-20 md:py-28 text-center text-white overflow-hidden shadow-xl">
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
            <FileText className="w-3.5 h-3.5 text-cyan-200" />
            <span>Legal Agreement</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
          >
            Terms of Use
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Please read these terms carefully before using the SkillSync AI-powered recruitment and job matching platform.
          </motion.p>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 sm:p-12 shadow-xl space-y-10"
        >
          <div className="border-b border-sky-100 pb-4 text-xs font-semibold text-slate-400">
            Last updated: October 23, 2026
          </div>

          <div className="space-y-8 text-slate-600 text-sm sm:text-base leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using SkillSync, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any part of these terms, you are prohibited from using or accessing our platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                2. User Accounts & Eligibility
              </h2>
              <p>
                To use certain features of SkillSync, you must register for an account. You agree to provide accurate, current, and complete information during registration and keep your account details updated. Accounts are categorized into two primary roles:
              </p>
              <ul className="list-disc pl-5 space-y-2 pt-1 font-medium text-slate-700">
                <li><strong className="text-slate-900">Job Seekers:</strong> Permitted to build profiles, upload CVs, run AI analyses, and apply for active vacancies.</li>
                <li><strong className="text-slate-900">Companies / Recruiters:</strong> Permitted to post job vacancies, manage applicants, and review AI-driven candidate ranking scores.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                3. Acceptable Use Policy
              </h2>
              <p>
                You agree not to misuse the SkillSync platform. Prohibited activities include uploading malicious files, scraping data without authorization, submitting false candidate or company credentials, or attempting to bypass platform security measures and AI rate limits.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                4. Intellectual Property Rights
              </h2>
              <p>
                All platform software, user interface designs, AI models, graphics, and text content are the property of SkillSync and protected under international copyright and trademark laws. You retain ownership of any personal resumes or corporate content you upload.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                5. Limitation of Liability
              </h2>
              <p>
                SkillSync provides AI-powered job matching and interview simulations as tools to assist recruitment. We do not guarantee employment placement or candidate hiring outcomes. The platform is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis without warranties of any kind.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <Shield className="w-3.5 h-3.5 text-cyan-200" />
            <span>Data Protection</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
          >
            Privacy Policy
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Discover how SkillSync collects, safeguards, and respects your personal and professional information.
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
                1. Information We Collect
              </h2>
              <p>
                We collect information you provide directly when creating an account, updating your profile, uploading CV documents, or applying for job openings. This includes your full name, email address, phone number, location, portfolio links, and employment history.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                2. How We Use Your Information
              </h2>
              <p>
                Your data is processed strictly to provide and improve platform functionality:
              </p>
              <ul className="list-disc pl-5 space-y-2 pt-1 font-medium text-slate-700">
                <li>Powering AI resume analysis and skill gap evaluations.</li>
                <li>Matching job seeker profiles with active employer vacancies.</li>
                <li>Managing job applications, interview schedules, and notifications.</li>
                <li>Ensuring platform security and preventing fraudulent activities.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                3. Data Security & Encryption
              </h2>
              <p>
                We take your security seriously. All personal data, uploaded resumes, and communications are encrypted in transit and at rest using industry-standard AES-256 protocols. Access to sensitive candidate records is strictly controlled via role-based permissions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                4. Data Sharing & Disclosure
              </h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. Profile details and resumes are only shared with registered employers and recruiters when you explicitly apply for their job postings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0F9DE4]" />
                5. Your Privacy Rights & Account Deletion
              </h2>
              <p>
                You retain full control over your data. You can update your profile information at any time through your dashboard. If you wish to discontinue using our platform, you can permanently delete your account and all associated data directly via the Account & Privacy settings.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
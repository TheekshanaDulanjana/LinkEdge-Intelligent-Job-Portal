'use client';

import * as React from "react";
import Link from "next/link";
import { Search, GraduationCap, Mic, BarChart3, ShieldCheck, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  {
    tag: "Got Talent?",
    title: "Why Job Seekers Love SkillSync?",
    features: [
      { icon: Search, t: "Smart Matching", d: "Stop searching and start discovering. Our AI reads your CV to find the best jobs for your specific skills." },
      { icon: GraduationCap, t: "Skill Gap Analysis", d: "We show you exactly what is missing from your profile and suggest the right courses to help you qualify for your dream role." },
      { icon: Mic, t: "Interview Confidence", d: "Practice with our AI Interviewer. Get real feedback and scores before you meet the actual company." }
    ]
  },
  {
    tag: "Need Talent?",
    title: "Why Recruiters Love SkillSync?",
    className: "md:pl-12",
    features: [
      { icon: BarChart3, t: "Automated Ranking", d: "Save hours of manual work. Our system automatically ranks every applicant from highest to lowest suitability based on your JD." },
      { icon: ShieldCheck, t: "Quality Over Quantity", d: "We don't just send you resumes; we send you candidates who are actually prepared for the role." },
      { icon: ClipboardCheck, t: "Smart Interview Prep", d: "Use our platform to ensure your candidates are ready. View their practice scores to make better hiring decisions faster." }
    ]
  }
];

export default function LinkEdgeLanding() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">

        {/* Center Divider */}
        <div className="hidden md:block absolute left-1/2 inset-y-0 w-px border-l border-dashed border-[#0F9DE4]" />

        {SECTIONS.map((sec, i) => (
          <div key={i} className={`space-y-10 ${sec.className || ""}`}>

            {/* Header */}
            <header className="space-y-2">
              <h3 className="text-xs font-semibold tracking-widest text-[#0F9DE4] uppercase">
                {sec.tag}
              </h3>
              <h2 className="text-xl md:text-2xl font-bold text-black">
                {sec.title}
              </h2>
            </header>

            {/* Features */}
            <div className="space-y-8">
              {sec.features.map((f, j) => (
                <div key={j} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 size-10 rounded-full bg-[#0F9DE4]/10 flex items-center justify-center">
                    <f.icon className="size-5 text-[#0F9DE4]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-slate-900">
                      {f.t}
                    </h4>
                    <p className="text-slate-600 text-xs md:text-xs leading-relaxed">
                      {f.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">

              {/* Learn More */}
              <Link href={i === 0 ? "/seeker-details" : "/company-details"}>
                <Button
                  variant="outline"
                  size="sm"
                  border={true}
                  hasBg={false}
                  className="text-[#0F9DE4] border-[#0F9DE4] w-24 cursor-pointer hover:scale-105"
                >
                  Learn more
                </Button>
              </Link>

              {/* Register */}
              <Link href="/register">
                <Button
                  variant="gradient"
                  size="sm"
                  className="cursor-pointer w-24 hover:scale-105"
                >
                  Register
                </Button>
              </Link>

            </div>

          </div>
        ))}
      </div>
    </section>
  );
}
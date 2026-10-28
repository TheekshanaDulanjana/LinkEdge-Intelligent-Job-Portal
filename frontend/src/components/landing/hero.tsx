"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { jobApi } from "@/lib/api";

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!value || value <= 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 1500;
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function HeroSection() {
  const [stats, setStats] = useState({
    activeJobs: 0,
    topCompanies: 0,
    candidates: 0,
  });

  useEffect(() => {
    async function fetchPortalStats() {
      try {
 const res = await jobApi.get("/jobs/portal-stats");
        const data = res.data?.data || res.data;

        if (data) {
          setStats({
            activeJobs: data.activeJobs ?? 0,
            topCompanies: data.topCompanies ?? 0,
            candidates: data.candidates ?? 0,
          });
        }
      } catch (error: any) {
        console.error("Failed to fetch live portal stats:", error);
      }
    }

    fetchPortalStats();
  }, []);

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-transparent w-full min-h-screen flex items-center justify-center pt-24 sm:pt-28">
      <section className="relative rounded-2xl md:rounded-3xl w-full overflow-hidden shadow-2xl py-12 lg:py-0 min-h-[85vh] lg:min-h-[92vh] flex items-center">
        
        <div className="absolute inset-0 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4]">
          <motion.div
            animate={{
              backgroundPosition: ["0px 0px", "64px 64px"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage: `
                linear-gradient(to right, #0F9DE4 1px, transparent 1px),
                linear-gradient(to bottom, #0F9DE4 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
              maskImage: "linear-gradient(to bottom, #0F9DE4, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, white, transparent)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full flex items-center justify-center my-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-12 items-center w-full">

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-start text-left w-full"
            >
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full bg-transparent border border-white/30 tracking-widest px-3.5 py-1 text-[11px] sm:text-xs text-white shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse shrink-0" />
                <span className="truncate">SkillSync - AI POWERED JOB PORTAL</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight"
              >
                Your Career Edge, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-sky-200">
                  Powered by Intelligence
                </span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-5 max-w-lg text-white/90 text-sm sm:text-base leading-relaxed"
              >
                Experience a recruitment portal that does more than just list jobs.
                SkillSync analyzes your potential, recommends paths for growth, and
                streamlines hiring with AI-powered insights.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto"
              >
                <Link href="/jobs" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                    <Button
                      variant="gradient"
                      size="md"
                      className="border-2 border-white cursor-pointer shadow-lg hover:shadow-cyan-500/35 transition-all w-full sm:w-auto"
                    >
                      Find New Job
                    </Button>
                  </motion.div>
                </Link>

                <Link href="/register?role=company" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="md"
                      border={true}
                      hasBg={false}
                      className="text-white bg-transparent border-white cursor-pointer hover:bg-white/10 transition-all w-full sm:w-auto"
                    >
                      Post New Job
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-10 sm:mt-12 grid grid-cols-3 gap-2 sm:gap-4 bg-transparent p-3.5 sm:p-4 rounded-2xl border border-white/20 w-full max-w-lg shadow-xl"
              >
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex gap-2 items-center cursor-default"
                >
                  <div className="w-1 h-7 sm:h-8 bg-gradient-to-t from-[#0F9DE4] to-[#0025B8] rounded-full shrink-0" />
                  <div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      <Counter value={stats.activeJobs} suffix="+" />
                    </h3>
                    <p className="text-white/80 text-[10px] sm:text-xs">Active Vacancies</p>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex gap-2 items-center cursor-default"
                >
                  <div className="w-1 h-7 sm:h-8 bg-gradient-to-t from-[#0F9DE4] to-[#0025B8] rounded-full shrink-0" />
                  <div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      <Counter value={stats.topCompanies} suffix="+" />
                    </h3>
                    <p className="text-white/80 text-[10px] sm:text-xs">Top Companies</p>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="flex gap-2 items-center cursor-default"
                >
                  <div className="w-1 h-7 sm:h-8 bg-gradient-to-t from-[#0F9DE4] to-[#0025B8] rounded-full shrink-0" />
                  <div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      <Counter value={stats.candidates} suffix="+" />
                    </h3>
                    <p className="text-white/80 text-[10px] sm:text-xs">Candidates</p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            <div className="relative flex flex-col gap-6 w-full max-w-lg mx-auto lg:ml-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: [0, -8, 0] }}
                transition={{ 
                  opacity: { duration: 0.8, delay: 0.4 },
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 } 
                }}
                className="relative z-20 bg-white rounded-[16px] p-5 sm:p-6 shadow-2xl w-full border border-gray-100"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 leading-snug">
                    Master Your Interview <br /> Before It Happens
                  </h3>
                  <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#0F9DE4] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#0025B8] tracking-wider">AI READY</span>
                  </div>
                </div>

                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="relative h-40 sm:h-44 rounded-xl bg-gradient-to-br from-slate-50 via-sky-50/60 to-white border border-sky-100 overflow-hidden flex flex-col items-center justify-center p-4 shadow-sm group cursor-pointer"
                >
                  <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#0025B8] to-[#0F9DE4] p-0.5 shadow-md mb-2">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[#0025B8]">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    </div>
                  </div>

                  <span className="relative z-10 text-xs font-semibold text-gray-800 tracking-wide">AI Voice & Video Practice</span>
                  <span className="relative z-10 text-[10px] text-gray-400 mb-3">Simulate real-time questions & feedback</span>

                  <div className="relative z-10 flex items-center gap-1 h-3">
                    {[0.6, 1, 0.4, 0.9, 0.7, 0.3, 0.8, 0.5].map((scaleVal, i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [0.3, scaleVal * 1.6, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                        className="w-1 bg-[#0F9DE4] rounded-full h-full origin-bottom"
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: [0, 8, 0] }}
                transition={{ 
                  opacity: { duration: 0.8, delay: 0.6 },
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 } 
                }}
                className="relative z-30 bg-white rounded-[16px] p-5 shadow-2xl w-full border border-gray-100"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-black font-semibold text-base">
                    Career Paths
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">Explore Roles</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    "Software Engineer",
                    "AI/ML Engineer",
                    "Full Stack Developer",
                    "UI/UX Designer",
                    "DevOps",
                    "Digital Marketer",
                    "Cloud Engineer",
                    "Data Scientist",
                    "QA Analyst",
                    "Product Manager",
                    "Data Engineer",
                    "Cybersecurity Analyst",
                    "Business Analyst",
                  ].map((item, index) => (
                    <Link key={item} href={`/jobs?search=${encodeURIComponent(item)}`} aria-label={`Search ${item} jobs`} className="inline-block">
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.5 + (index * 0.03) }}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative text-xs px-3 py-1.5 bg-sky-50/40 rounded-md cursor-pointer"
                    >
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='url(%23g)' stroke-width='1.5' stroke-dasharray='4%2c 3' stroke-dashoffset='0' stroke-linecap='square'/%3e%3cdefs%3e%3clinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3e%3cstop offset='0%25' stop-color='%230F9DE4'/%3e%3cstop offset='100%25' stop-color='%230025B8'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e")`,
                          borderRadius: "6px",
                        }}
                      />
                      <span className="relative z-10 text-gray-700 font-medium">
                        {item}
                      </span>
                    </motion.span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>

          </div>
        </div>

      </section>
    </div>
  );
}
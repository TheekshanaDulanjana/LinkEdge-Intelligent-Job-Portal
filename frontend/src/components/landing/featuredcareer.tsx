"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { JobCard } from "@/components/ui/JobCard"
import { Button } from "@/components/ui/button"

const JOBS_DATA = [
  {
    title: "Junior QA Automation Engineer",
    company: "Aura AI Systems",
    score: 82,
    date: "05/04/2026",
    tags: ["Full-Time", "On-site", "Closing in 5 days"]
  },
  {
    title: "Frontend React Developer",
    company: "CodeGen International",
    score: 68,
    date: "04/04/2026",
    tags: ["Full-Time", "Remote", "Closing in 3 days"]
  },
  {
    title: "UI/UX Designer Intern",
    company: "Creative Solutions LK",
    score: 45,
    date: "03/04/2026",
    tags: ["Internship", "Hybrid", "Closing in 7 days"]
  },
  {
    title: "Backend Node.js Engineer",
    company: "TechWave Pvt Ltd",
    score: 77,
    date: "02/04/2026",
    tags: ["Full-Time", "On-site", "Closing in 4 days"]
  },
  {
    title: "Mobile App Developer (Flutter)",
    company: "InnovaSoft",
    score: 59,
    date: "01/04/2026",
    tags: ["Contract", "Remote", "Closing in 6 days"]
  },
  {
    title: "Data Analyst",
    company: "Insight Analytics",
    score: 33,
    date: "30/03/2026",
    tags: ["Full-Time", "Hybrid", "Closing soon"]
  }
]

export default function CareerOpenings() {
  const router = useRouter()

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-16 font-sans">

      <div className="flex justify-between items-end mb-10">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold tracking-widest text-[#0F9DE4] uppercase">
            Start Your Journey
          </h3>

          <h2 className="text-2xl md:text-3xl font-semibold mt-2 text-slate-900">
            Featured Career Openings
          </h2>
        </div>

        <Button
          variant="gradient"
          className="h-10 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => router.push("/jobs")}
        >
          View All
        </Button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {JOBS_DATA.map((job, index) => (
          <JobCard
            key={index}
            title={job.title}
            company={job.company}
            score={job.score}
            date={job.date}
            tags={job.tags}
          />
        ))}
      </div>

    </section>
  )
}
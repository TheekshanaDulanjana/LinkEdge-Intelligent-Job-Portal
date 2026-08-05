"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import JobCard from "@/components/jobs/JobCard"
import { Button } from "@/components/ui/button"
import { jobApi } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"

export default function CareerOpenings() {
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeaturedJobs() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        const userId = useAuthStore.getState().user?.id
        if (userId) params.append("seekerId", userId)

        const res = await jobApi.get(`/jobs?${params.toString()}`)
        const fetchedJobs = res.data?.data?.jobs || res.data?.jobs || []
        
        // Display top 6 jobs as featured
        setJobs(fetchedJobs.slice(0, 6))
      } catch (e) {
        console.error("API Error:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedJobs()
  }, [])

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-16 font-sans">
      <div className="flex justify-between items-end mb-10">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold tracking-widest text-[#0F9DE4] uppercase">
            Start Your Journey
          </h3>

          <h2 className="text-2xl md:text-3xl font-semibold mt-2 text-slate-900">
            Recent Career Openings
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-50 animate-pulse rounded-2xl border border-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length > 0 ? (
            jobs.map((job: any) => (
              <JobCard
                key={job.id}
                id={job.id}
                title={job.title}
                company={job.company}
                location={job.location}
                jobType={job.jobType}
                deadline={job.deadline}
                salaryMin={job.salaryMin}
                salaryMax={job.salaryMax}
                atsScore={job.atsScore}
                atsColor={job.atsColor}
                atsLabel={job.atsLabel}
                matchedSkills={job.matchedSkills}
                missingSkills={job.missingSkills}
                job={job}
              />
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-gray-400 border border-dashed rounded-2xl">
              No Recent vacancies available at the moment.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
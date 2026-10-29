"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
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
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 font-sans">
      
      {/* Section Header with Motion Animation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
      >
        <div className="space-y-2">
          <span className="inline-block text-xs font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 shadow-sm">
            Start Your Journey
          </span>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Recent Career Openings
          </h2>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="gradient"
            className="h-11 px-6 rounded-full cursor-pointer shadow-md hover:shadow-lg transition-all font-semibold"
            onClick={() => router.push("/jobs")}
          >
            View All Jobs
          </Button>
        </motion.div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-72 bg-gradient-to-br from-slate-50 to-sky-50/40 animate-pulse rounded-3xl border border-gray-100 shadow-sm"
            />
          ))}
        </div>
      ) : (
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {jobs.length > 0 ? (
            jobs.map((job: any, index: number) => (
              <motion.div
                key={job.id}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  show: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                whileHover={{ y: -6 }}
                className="h-full transition-transform"
              >
                <JobCard
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
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full py-20 text-center text-slate-500 bg-white/60 backdrop-blur-sm border-2 border-dashed border-sky-100 rounded-3xl shadow-sm"
            >
              <p className="text-base font-medium">No Recent vacancies available at the moment.</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </section>
  )
}
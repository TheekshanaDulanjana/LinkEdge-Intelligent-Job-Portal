import React from "react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <div className="p-3 bg-white">
      <section className="relative rounded-2xl min-h-screen w-full overflow-hidden">
        
        {/* Background Gradient & Grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4]">
          <div
            className="absolute inset-0 opacity-32"
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

        {/* Content (CENTERED) */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 h-screen flex items-center justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">

            {/* LEFT SIDE */}
            <div>
              {/* Tag */}
              <div className="mb-4 inline-block rounded-full bg-white/16 border border-white/20 tracking-widest px-4 py-1 text-xs text-white backdrop-blur-md">
                SkillSync - AI POWERED JOB PORTAL
              </div>

              {/* Heading */}
              <h1 className="text-4xl lg:text-5xl font-semibold text-white leading-tight">
                Your Career Edge, <br />
                Powered by Intelligence
              </h1>

              {/* Description */}
              <p className="mt-6 max-w-lg text-white text-base">
                Experience a recruitment portal that does more than just list jobs.
                SkillSync analyzes your potential, recommends paths for growth, and
                streamlines hiring with AI-powered insights.
              </p>

              {/* Buttons */}
              <div className="mt-8 flex gap-4">
                <Button
                  variant="gradient"
                  size="md"
                  className="border-2 border-white cursor-pointer hover:scale-105"
                >
                  Get Started
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  border={true}
                  hasBg={false}
                  className="text-white bg-transparent backdrop-blur-xs border-white cursor-pointer hover:scale-105"
                >
                  Post a Job
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-12 flex gap-10">
                <div className="flex gap-4">
                  <div className="w-1 bg-gradient-to-t from-[#0F9DE4] to-[#0025B8] rounded-full" />
                  <div>
                    <h3 className="text-4xl font-bold text-white">150+</h3>
                    <p className="text-white text-sm">Active Vacancies</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1 bg-gradient-to-t from-[#0F9DE4] to-[#0025B8] rounded-full" />
                  <div>
                    <h3 className="text-4xl font-bold text-white">50+</h3>
                    <p className="text-white text-sm">Top Companies</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-1 bg-gradient-to-t from-[#0F9DE4] to-[#0025B8] rounded-full" />
                  <div>
                    <h3 className="text-4xl font-bold text-white">1,150+</h3>
                    <p className="text-white text-sm">Skilled Candidates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="relative flex flex-col gap-6">

              {/* Floating Glass Shape */}
              {/* <div className="absolute left-0 top-10 w-56 h-56 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/20" /> */}

              {/* Main Card */}
              <div className="relative z-20 bg-white rounded-[16px] p-6 shadow-2xl max-w-sm ml-auto">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Master Your Interview <br /> Before It Happens
                </h3>

                <div className="h-40 rounded-xl bg-gray-100 border border-dashed flex items-center justify-center text-gray-400 text-sm">
                  AI Interview Simulator
                </div>
              </div>

              {/* Career Path Card */}
              <div className="relative z-30 bg-white rounded-[16px] p-5 shadow-xl max-w-xl ml-auto">
                <h4 className="text-black font-semibold mb-3">
                  Career Paths
                </h4>

                <div className="flex flex-wrap justify-between gap-y-3">
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
                  ].map((item) => (
                    <span
                      key={item}
                      className="relative text-xs px-3 py-1 bg-transparent"
                    >
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='url(%23g)' stroke-width='1.5' stroke-dasharray='4%2c 3' stroke-dashoffset='0' stroke-linecap='square'/%3e%3cdefs%3e%3clinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3e%3cstop offset='0%25' stop-color='%230F9DE4'/%3e%3cstop offset='100%25' stop-color='%230025B8'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e")`,
                          borderRadius: "6px",
                        }}
                      />
                      <span className="relative z-10 text-gray-700">
                        {item}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>

      </section>
    </div>
  );
}
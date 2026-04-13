import React from "react";

const JOBS = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile App Developer",
  "QA Engineer", "DevOps Engineer", "Cybersecurity Analyst", "UI/UX Designer", "Product Designer",
  "Graphic Designer", "Motion Graphics Artist", "Data Scientist", "AI/Machine Learning Engineer", "Data Analyst",
  "Project Manager", "Business Analyst", "Digital Marketer", "Cloud Engineer", "Database Administrator", "Technical Writer",
];

export default function CareerPath() {
  return (
    <section className="w-full py-16 px-4 text-center font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          Choose Your Career Path
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Explore thousands of job openings across 20+ specialized industries and find the perfect match for your expertise.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {JOBS.map((job) => (
            <div key={job} className="relative group">
              {/* Gradient Border Layer */}
              <div 
                className="absolute inset-0 rounded-lg border-2 border-dashed border-[#0F9DE4] pointer-events-none"
             
              />
              <div className="relative px-6 py-3 text-[#0025B8] font-medium  rounded-lg">
                {job}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
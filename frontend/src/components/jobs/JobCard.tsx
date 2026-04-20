import React from "react";
import Link from 'next/link';
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

const getScoreStyle = (score: number) => {
  if (score < 50) {
    return {
      bg: "bg-red-50",
      border: "border-red-500",
      badge: "bg-red-500",
      text: "text-red-500"
    };
  } else if (score >= 75) {
    return {
      bg: "bg-emerald-50",
      border: "border-[#09DB80]",
      badge: "bg-[#09DB80]",
      text: "text-[#09DB80]"
    };
  } else {
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-500",
      badge: "bg-yellow-500",
      text: "text-yellow-500"
    };
  }
};

export default function JobCard({ job }: { job: any }) {
  // Use 75 as default if score is missing
  const score = job.aiScore || 75; 
  const scoreStyle = getScoreStyle(score);

  return (
    <div className="bg-white rounded-[16px] p-6 border border-gray-100 shadow-sm space-y-5 relative group hover:shadow-md transition-all">
      
      {/* Top Section */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          {/* Company Logo Logic */}
          <div className="size-12 bg-gray-100 rounded-md flex items-center justify-center font-bold text-gray-300 overflow-hidden border">
            {job.company?.logoUrl ? (
              <img 
                src={`http://localhost:3001${job.company.logoUrl}`} 
                alt="logo" 
                className="object-cover w-full h-full" 
              />
            ) : (
              "LOGO"
            )}
          </div>
          
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              We are hiring
            </p>
            {/* Clickable Company Name */}
            <Link href={`/company/${job.company.id}/profile`}>
              <h4 className="font-semibold text-black leading-tight hover:text-blue-600 transition-colors cursor-pointer">
                {job.company?.companyName || "Company Name"}
              </h4>
            </Link>
            <p className="text-[10px] text-gray-400">Posted recently</p>
          </div>
        </div>

        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
            <Bookmark className="size-5 text-gray-400 cursor-pointer" />
        </Button>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-balack leading-snug min-h-[56px]  transition-colors">
        {job.title}
      </h3>

      {/* Tags Logic */}
      <div className="flex flex-wrap gap-2 -mt-6 ">
        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold">Full-Time</span>
        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold">{job.location}</span>
        {job.tags?.map((tag: string) => (
          <span
            key={tag}
            className="px-3 py-1 bg-[#919191] text-white text-[10px] rounded-full font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className={`flex items-center gap-2 rounded-full pr-3 w-fit border ${scoreStyle.bg} ${scoreStyle.border}`}>
        <span className={`${scoreStyle.badge} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>
          AI Match Score
        </span>
        <span className={`${scoreStyle.text} text-xs font-semibold`}>
          {score}%
        </span>
      </div>

      <hr className="border-gray-100" />

      {/* Apply Button */}
      <Link href={`/jobs/${job.id}`} className="block">
        <Button className="w-full h-10 cursor-pointer">
          Apply Now
        </Button>
      </Link>
    </div>
  );
}
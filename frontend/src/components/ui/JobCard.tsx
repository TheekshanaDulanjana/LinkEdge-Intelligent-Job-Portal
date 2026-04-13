import React from "react"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"

interface JobCardProps {
  title: string;
  company: string;
  score: number;
  date: string;
  tags: string[];
}

// 🔥 AI Score Color Logic
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

export function JobCard({ title, company, score, date, tags }: JobCardProps) {

  const scoreStyle = getScoreStyle(score);

  return (
    <div className="bg-white rounded-[16px] p-6 border border-gray-50 shadow-sm space-y-5 relative">
      
      {/* Top Section */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="size-12 bg-gray-200 rounded-md" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              We are hiring
            </p>
            <h4 className="font-semibold text-black leading-tight">
              {company}
            </h4>
            <p className="text-[10px] text-gray-400">{date}</p>
          </div>
        </div>

        <Bookmark className="size-5 text-gray-400 cursor-pointer" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-slate-900 leading-snug min-h-[56px]">
        {title}
      </h3>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-[#919191] text-white text-[10px] rounded-full font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 🔥 AI Score */}
      <div className={`flex items-center gap-2 rounded-full pr-3 w-fit border ${scoreStyle.bg} ${scoreStyle.border}`}>
        <span className={`${scoreStyle.badge} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>
          AI Match Score
        </span>
        <span className={`${scoreStyle.text} text-xs font-semibold`}>
          {score}%
        </span>
      </div>

      <hr className="border-gray-100" />

      {/* Button */}
      <Button variant="gradient" className="w-full h-8">
        Apply Now
      </Button>
    </div>
  )
}
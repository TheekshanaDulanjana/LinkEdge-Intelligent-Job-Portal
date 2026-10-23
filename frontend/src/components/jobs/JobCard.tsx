'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface JobCardProps {
  id: string;
  title: string;
  company: {
    id: string;
    companyName: string;
    logoUrl?: string;
  } | null;
  location: string;
  jobType: string;
  deadline: string;
  salaryMin?: number;
  salaryMax?: number;
  atsScore?: number | null;
  atsColor?: 'green' | 'yellow' | 'red' | null;
  atsLabel?: string | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  onApply?: () => void;
}

function ATSScoreBadge({ score, color }: { score: number; color: string }) {
  const colorMap = {
    green: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', fill: 'bg-emerald-500' },
    yellow: { bg: 'bg-amber-50 text-amber-700 border-amber-200', fill: 'bg-amber-500' },
    red: { bg: 'bg-rose-50 text-rose-700 border-rose-200', fill: 'bg-rose-500' },
  };

  const c = colorMap[color as keyof typeof colorMap] || colorMap.green;

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${c.bg}`}>
      <span>Matching Score</span>
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${c.fill}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span>{score.toFixed(0)}%</span>
    </div>
  );
}

export default function JobCard({
  id,
  title,
  company,
  location,
  jobType,
  deadline,
  salaryMin,
  salaryMax,
  atsScore,
  atsColor,
  matchedSkills = [],
  missingSkills = [],
  onApply,
}: JobCardProps) {
  const isPastDeadline = new Date(deadline) < new Date();

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-sky-100 p-6 shadow-lg hover:shadow-2xl transition-all relative flex flex-col justify-between group"
    >
      <div>
        {/* Header (Save icon removed completely) */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl.startsWith('http') ? company.logoUrl : `http://localhost:3001${company.logoUrl}`}
                alt={company.companyName}
                className="w-12 h-12 rounded-2xl object-cover bg-sky-50 border border-sky-100 flex-shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] flex items-center justify-center flex-shrink-0 text-white font-bold text-base shadow-md">
                {company?.companyName?.[0]?.toUpperCase() || 'C'}
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-[#0F9DE4] font-bold block">
                WE ARE HIRING
              </span>

              {company && (
                <Link
                  href={`/company/${company.id}/profile`}
                  className="text-base font-bold text-slate-900 hover:text-[#0F9DE4] transition-colors block leading-snug truncate"
                >
                  {company.companyName}
                </Link>
              )}

              <span className="text-xs text-slate-400 block mt-0.5 font-medium">
                {location}
              </span>
            </div>
          </div>
        </div>

        {/* Job Title */}
        <h2 className="text-xl font-bold text-slate-900 mb-3 leading-snug">
          <Link href={`/jobs/${id}`} className="hover:text-[#0F9DE4] transition-colors">
            {title}
          </Link>
        </h2>

        {/* Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="bg-sky-50 text-[#0025B8] text-xs font-semibold px-3 py-1 rounded-full border border-sky-100 capitalize">
            {jobType.replace('_', '-').toLowerCase()}
          </span>

          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200">
            {isPastDeadline ? 'Closed' : `Closes ${new Date(deadline).toLocaleDateString()}`}
          </span>

          {salaryMin && (
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-100">
              LKR {salaryMin.toLocaleString()} {salaryMax ? `– ${salaryMax.toLocaleString()}` : ''}
            </span>
          )}
        </div>

        {/* ATS Score Badge */}
        {atsScore !== null && atsScore !== undefined && atsColor ? (
          <div className="mb-4">
            <ATSScoreBadge score={atsScore} color={atsColor} />
          </div>
        ) : null}

        {/* Skill Match Pills */}
        {atsScore !== null && atsScore !== undefined && (matchedSkills.length > 0 || missingSkills.length > 0) && (
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
            {matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.slice(0, 4).map((s) => (
                  <span key={s} className="bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-lg font-semibold text-[11px] border border-emerald-200/50">
                    ✓ {s}
                  </span>
                ))}
                {matchedSkills.length > 4 && (
                  <span className="text-slate-400 text-[11px] font-medium self-center pl-1">
                    +{matchedSkills.length - 4} more
                  </span>
                )}
              </div>
            )}
            {missingSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.slice(0, 3).map((s) => (
                  <span key={s} className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-lg font-semibold text-[11px] border border-green-200/50">
                    ✕ {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {atsScore === null && (
          <Link href="/seeker/profile" className="block mb-4">
            <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-2.5 text-xs text-[#0025B8] font-semibold hover:bg-sky-100/70 transition-colors shadow-sm flex items-center justify-between">
              <span>Upload CV to check your ATS Match Score</span>
              <span>→</span>
            </div>
          </Link>
        )}
      </div>

      <div>
        <hr className="border-slate-100 my-4" />

        <Link href={`/jobs/${id}`} className="block">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isPastDeadline}
            onClick={onApply}
            className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] hover:opacity-95 text-white rounded-full transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPastDeadline ? 'Applications Closed' : 'Apply Now'}
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
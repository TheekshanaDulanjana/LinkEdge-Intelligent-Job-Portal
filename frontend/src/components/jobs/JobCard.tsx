'use client';

import Link from 'next/link';

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

function ATSScoreBadge({
  score,
  color,
}: {
  score: number;
  color: string;
  label?: string | null;
}) {
  const colorMap = {
    green: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500' },
    yellow: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500' },
    red: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500' },
  };

  const c = colorMap[color as keyof typeof colorMap] || colorMap.green;

  return (
    <div className={`inline-flex items-center rounded-full border ${c.border} overflow-hidden text-xs font-semibold`}>
      <span className={`${c.bg} text-black font-medium px-3 py-1.5`}>
        AI Match Score
      </span>
      <span className="bg-emerald-100 text-gray-900 px-3 py-1.5 min-w-[48px] text-center">
        {score.toFixed(0)}%
      </span>
    </div>
  );
}

export default function JobCard({
  id, title, company, location, jobType, deadline,
  salaryMin, salaryMax, atsScore, atsColor, atsLabel,
  matchedSkills = [], missingSkills = [], onApply,
}: JobCardProps) {
  const isPastDeadline = new Date(deadline) < new Date();

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative">
      {/* Header section with Logo, Text and Bookmark icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Company logo */}
          {company?.logoUrl ? (
            <img
              src={`http://localhost:3001${company.logoUrl}`}
              alt={company.companyName}
              className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 font-bold text-lg">
              {company?.companyName?.[0]?.toUpperCase() || 'C'}
            </div>
          )}

          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">
              WE ARE HIRING
            </span>

            {company && (
              <Link
                href={`/company/${company.id}/profile`}
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors block leading-tight truncate"
              >
                {company.companyName}
              </Link>
            )}

            <span className="text-[11px] text-gray-400 block mt-0.5">
              {new Date(deadline).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Bookmark Icon */}
        <button type="button" className="text-gray-900 hover:text-gray-600 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Job Title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
        <Link href={`/jobs/${id}`} className="hover:text-blue-600 transition-colors">
          {title}
        </Link>
      </h2>

      {/* Chips section */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="bg-gray-400 text-white text-xs font-medium px-4 py-1.5 rounded-full capitalize">
          {jobType.replace('_', '-').toLowerCase()}
        </span>

        <span className="bg-gray-400 text-white text-xs font-medium px-4 py-1.5 rounded-full">
          {location}
        </span>

        <span className="bg-gray-400 text-white text-xs font-medium px-4 py-1.5 rounded-full">
          {isPastDeadline ? 'Closed' : `Closes ${new Date(deadline).toLocaleDateString()}`}
        </span>

        {salaryMin && (
          <span className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
            LKR {salaryMin.toLocaleString()}–{salaryMax?.toLocaleString()}
          </span>
        )}
      </div>

      {/* ATS Score Badge */}
      {atsScore !== null && atsScore !== undefined && atsColor ? (
        <div className="mb-4">
          <ATSScoreBadge score={atsScore} color={atsColor} label={atsLabel} />
        </div>
      ) : null}

      {/* ATS skill details */}
      {atsScore !== null && atsScore !== undefined && (matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs">
          {matchedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {matchedSkills.slice(0, 4).map(s => (
                <span key={s} className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">✓ {s}</span>
              ))}
              {matchedSkills.length > 4 && (
                <span className="text-gray-400">+{matchedSkills.length - 4} more</span>
              )}
            </div>
          )}
          {missingSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {missingSkills.slice(0, 3).map(s => (
                <span key={s} className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-xs">○ {s}</span>
              ))}
              {missingSkills.length > 3 && (
                <span className="text-gray-400 text-xs">+{missingSkills.length - 3} skills to add</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* No resume message */}
      {atsScore === null && (
        <Link href="/seeker/profile" className="block mb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-600 hover:bg-blue-100 transition-colors">
            Upload your CV to see your match score →
          </div>
        </Link>
      )}

      <hr className="border-gray-200 my-4" />

      {/* Apply button */}
      <Link href={`/jobs/${id}`} className="block">
        <button
          disabled={isPastDeadline}
          onClick={onApply}
          className="w-full py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPastDeadline ? 'Applications Closed' : 'Apply Now'}
        </button>
      </Link>
    </div>
  );
}
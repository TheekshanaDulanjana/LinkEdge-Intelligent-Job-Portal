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

function ATSScoreBadge({ score, color }: { score: number; color: string }) {
  const colorMap = {
    green: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', fill: 'bg-emerald-500' },
    yellow: { bg: 'bg-amber-50 text-amber-700 border-amber-200', fill: 'bg-amber-500' },
    red: { bg: 'bg-rose-50 text-rose-700 border-rose-200', fill: 'bg-rose-500' },
  };

  const c = colorMap[color as keyof typeof colorMap] || colorMap.green;

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${c.bg}`}>
      <span>AI Match Score</span>
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl.startsWith('http') ? company.logoUrl : `http://localhost:3001${company.logoUrl}`}
                alt={company.companyName}
                className="w-12 h-12 rounded-xl object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-base shadow-sm">
                {company?.companyName?.[0]?.toUpperCase() || 'C'}
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold block">
                WE ARE HIRING
              </span>

              {company && (
                <Link
                  href={`/company/${company.id}/profile`}
                  className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors block leading-snug truncate"
                >
                  {company.companyName}
                </Link>
              )}

              <span className="text-xs text-gray-400 block mt-0.5">
                {location}
              </span>
            </div>
          </div>

          <button type="button" className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        {/* Job Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">
          <Link href={`/jobs/${id}`} className="hover:text-blue-600 transition-colors">
            {title}
          </Link>
        </h2>

        {/* Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-md capitalize">
            {jobType.replace('_', '-').toLowerCase()}
          </span>

          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-md">
            {isPastDeadline ? 'Closed' : `Closes ${new Date(deadline).toLocaleDateString()}`}
          </span>

          {salaryMin && (
            <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-md">
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
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 text-xs space-y-2">
            {matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {matchedSkills.slice(0, 4).map((s) => (
                  <span key={s} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-medium text-[11px]">
                    ✓ {s}
                  </span>
                ))}
                {matchedSkills.length > 4 && (
                  <span className="text-gray-400 text-[11px] font-medium align-self-center">
                    +{matchedSkills.length - 4} more
                  </span>
                )}
              </div>
            )}
            {missingSkills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {missingSkills.slice(0, 3).map((s) => (
                  <span key={s} className="bg-green-100 text-green-800 px-2 py-0.5 rounded-md font-medium text-[11px]">
                    ✕ {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {atsScore === null && (
          <Link href="/seeker/profile" className="block mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-600 font-medium hover:bg-blue-100 transition-colors">
              Upload CV to check your ATS Match Score →
            </div>
          </Link>
        )}
      </div>

      <div>
        <hr className="border-gray-100 my-4" />

        <Link href={`/jobs/${id}`} className="block">
          <button
            disabled={isPastDeadline}
            onClick={onApply}
            className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPastDeadline ? 'Applications Closed' : 'Apply Now'}
          </button>
        </Link>
      </div>
    </div>
  );
}
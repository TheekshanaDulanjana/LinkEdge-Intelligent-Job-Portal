'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Briefcase, Building2, CalendarDays, ChevronRight, Globe, MapPin, Phone, Wallet } from 'lucide-react';

interface CompanyJob {
  id: string;
  title: string;
  location: string;
  jobType: string;
  deadline: string;
  department?: string | null;
  experienceLevel?: string | null;
  locationType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
}

interface CompanyPublicProfile {
  id: string;
  companyName: string;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  phone?: string | null;
  aboutUs?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  createdAt?: string;
  jobs: CompanyJob[];
}

const label = (v?: string | null) => (v ? v.replace(/_/g, ' ').toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase()) : '');

function salary(j: CompanyJob) {
  if (!j.salaryMin && !j.salaryMax) return '';
  const f = (n: number) => n.toLocaleString('en-US');
  if (j.salaryMin && j.salaryMax) return `${f(j.salaryMin)} - ${f(j.salaryMax)}`;
  return f((j.salaryMin || j.salaryMax) as number);
}

function safeUrl(u: string) {
  const full = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try { const p = new URL(full); return p.protocol === 'http:' || p.protocol === 'https:' ? full : null; } catch { return null; }
}

export default function PublicCompanyProfilePage() {
  const { companyId } = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/auth/company/${companyId}/public`)
      .then((res) => setCompany(res.data.data))
      .catch(() => router.push('/jobs'))
      .finally(() => setLoading(false));
  }, [companyId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="w-8 h-8 border-4 border-[#0F9DE4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!company) return null;

  const site = company.website ? safeUrl(company.website) : null;
  const since = company.createdAt ? new Date(company.createdAt).getFullYear() : null;

  const info = [
    { icon: Building2, label: 'Industry', value: company.industry },
    { icon: MapPin, label: 'Location', value: company.location },
    { icon: Phone, label: 'Phone', value: company.phone },
    { icon: CalendarDays, label: 'On the platform since', value: since ? String(since) : null },
  ].filter((i) => i.value);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="relative h-44 sm:h-60 bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] overflow-hidden">
        {company.coverImageUrl && (
          <img src={assetUrl(company.coverImageUrl)} alt="Company cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14 mb-8 relative z-10">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden shrink-0">
            {company.logoUrl ? (
              <img src={assetUrl(company.logoUrl)} alt={company.companyName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-sky-50 flex items-center justify-center text-[#0025B8] font-bold text-3xl">
                {company.companyName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="sm:pb-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">{company.companyName}</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {[company.industry, company.location].filter(Boolean).join(' · ') || 'Company'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 sm:p-8">
              <h2 className="font-bold text-slate-900 mb-3">About us</h2>
              {company.aboutUs ? (
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap break-words">{company.aboutUs}</p>
              ) : (
                <p className="text-slate-400 text-sm">This company has not added a description yet.</p>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6 sm:p-8">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0F9DE4]" /> Open positions ({company.jobs.length})
              </h2>
              {company.jobs.length === 0 ? (
                <p className="text-slate-400 text-sm">No open positions at this time.</p>
              ) : (
                <div className="space-y-3">
                  {company.jobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="group block">
                      <div className="flex items-center justify-between gap-3 p-4 border border-sky-100 rounded-2xl hover:border-[#0F9DE4] hover:bg-sky-50/60 transition-all">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 group-hover:text-[#0025B8] truncate">{job.title}</p>
                          <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                            {job.department && <span>{job.department}</span>}
                            {job.experienceLevel && <span>{label(job.experienceLevel)}</span>}
                            {salary(job) && <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" />{salary(job)}</span>}
                            <span>Deadline {new Date(job.deadline).toLocaleDateString('en-GB')}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-[#0025B8] border border-sky-100">
                            {label(job.jobType)}
                          </span>
                          {job.locationType && (
                            <span className="hidden sm:inline text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                              {label(job.locationType)}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0F9DE4]" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-3xl border border-sky-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4 text-sm">Company info</h3>
              <div className="space-y-4">
                {info.map(({ icon: Icon, label: l, value }) => (
                  <div key={l} className="flex items-start gap-3 text-sm">
                    <Icon className="w-4 h-4 text-[#0F9DE4] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{l}</p>
                      <p className="text-slate-700 font-medium break-words">{value}</p>
                    </div>
                  </div>
                ))}
                {site && company.website && (
                  <div className="flex items-start gap-3 text-sm">
                    <Globe className="w-4 h-4 text-[#0F9DE4] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Website</p>
                      <a href={site} target="_blank" rel="noopener noreferrer" className="text-[#0025B8] font-medium hover:underline break-all">
                        {company.website.replace(/^https?:\/\//i, '')}
                      </a>
                    </div>
                  </div>
                )}
                {info.length === 0 && !site && <p className="text-slate-400 text-sm">No details added yet.</p>}
              </div>
            </div>

            <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0025B8] hover:underline">
              <ArrowLeft className="w-4 h-4" /> All jobs
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

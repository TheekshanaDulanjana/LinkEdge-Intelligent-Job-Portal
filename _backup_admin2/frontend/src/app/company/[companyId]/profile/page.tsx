'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Briefcase, Building2, CalendarDays, ChevronRight, Globe, MapPin, Phone, Wallet, Share2, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';

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
  const [copied, setCopied] = useState(false);

  // Footer eka hide kirima me page ekedi
  useEffect(() => {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
      footerElement.style.display = 'none';
    }
    return () => {
      if (footerElement) {
        footerElement.style.display = '';
      }
    };
  }, []);

  useEffect(() => {
    api.get(`/auth/company/${companyId}/public`)
      .then((res) => setCompany(res.data.data))
      .catch(() => router.push('/jobs'))
      .finally(() => setLoading(false));
  }, [companyId, router]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#0F9DE4] border-t-transparent rounded-full animate-spin" />
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
    { icon: CalendarDays, label: 'Member Since', value: since ? String(since) : null },
  ].filter((i) => i.value);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 pb-20">
      
      {/* Global Navigation Header Component */}
      <Header />

      {/* Facebook-style Cover Photo Section */}
      <div className="relative w-full h-56 sm:h-80 bg-gradient-to-r from-[#0025B8] via-[#0968D1] to-[#0F9DE4] overflow-hidden shadow-sm">
        {company.coverImageUrl && (
          <img src={assetUrl(company.coverImageUrl)} alt="Company cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/10 to-transparent" />
      </div>

      {/* Main Profile Info Header Container (Overlap Design) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 shadow-xl p-6 sm:p-8 -mt-16 sm:-mt-20 mb-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Avatar Logo */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] border-4 border-white bg-white shadow-xl overflow-hidden shrink-0 -mt-14 sm:-mt-16 relative">
                {company.logoUrl ? (
                  <img src={assetUrl(company.logoUrl)} alt={company.companyName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center text-[#0025B8] font-black text-4xl">
                    {company.companyName[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Title & Meta */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{company.companyName}</h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center justify-center sm:justify-start gap-2">
                  <span>{[company.industry, company.location].filter(Boolean).join(' · ') || 'Verified Organization'}</span>
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-sky-50 text-[#0025B8] border border-sky-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Actively Hiring
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {company.jobs.length} {company.jobs.length === 1 ? 'Open Position' : 'Open Positions'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions / Share Button */}
            <div className="flex items-center justify-center gap-3 pt-2 sm:pt-0">
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold border border-sky-200 text-[#0025B8] bg-white hover:bg-sky-50 transition-all shadow-xs cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#0F9DE4]" />}
                {copied ? 'Link Copied!' : 'Share Profile'}
              </button>
            </div>

          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: About Us & Open Jobs (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* About Us Card */}
            <section className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 shadow-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0F9DE4]" /> About Company
              </h2>
              {company.aboutUs ? (
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">{company.aboutUs}</p>
              ) : (
                <p className="text-slate-400 text-xs sm:text-sm font-medium italic">This company has not added an executive description yet.</p>
              )}
            </section>

            {/* Open Positions Card */}
            <section className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 shadow-xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-sky-100 pb-4">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#0F9DE4]" /> Open Positions
                </h2>
                <span className="text-xs font-extrabold text-[#0025B8] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                  {company.jobs.length} Available
                </span>
              </div>

              {company.jobs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-slate-400 text-sm font-medium">No open positions at this time.</p>
                  <p className="text-xs text-slate-400">Check back later for newly published vacancies.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {company.jobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="group block">
                      <div className="flex items-center justify-between gap-4 p-5 border border-sky-100 rounded-2xl hover:border-[#0F9DE4] hover:bg-sky-50/40 transition-all shadow-xs bg-slate-50/30">
                        <div className="min-w-0 space-y-1.5">
                          <p className="font-bold text-slate-900 group-hover:text-[#0025B8] text-sm sm:text-base transition-colors truncate">{job.title}</p>
                          <p className="text-xs text-slate-500 font-medium flex flex-wrap gap-x-4 gap-y-1">
                            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.location}</span>
                            {job.department && <span className="text-slate-600 font-semibold">{job.department}</span>}
                            {job.experienceLevel && <span>{label(job.experienceLevel)}</span>}
                            {salary(job) && <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Wallet className="w-3.5 h-3.5" />LKR {salary(job)}</span>}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="hidden sm:flex flex-col items-end gap-1">
                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-50 text-[#0025B8] border border-sky-200 shadow-xs">
                              {label(job.jobType)}
                            </span>
                            {job.locationType && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {label(job.locationType)}
                              </span>
                            )}
                          </div>
                          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-[#0025B8] flex items-center justify-center group-hover:bg-[#0025B8] group-hover:text-white transition-all shadow-xs">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Company Details Sidebar (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 shadow-xl p-6 sm:p-7 space-y-5">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-wider uppercase border-b border-sky-100 pb-3">Company Overview</h3>
              
              <div className="space-y-4">
                {info.map(({ icon: Icon, label: l, value }) => (
                  <div key={l} className="flex items-start gap-3.5 text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-[#0F9DE4] flex items-center justify-center shrink-0 shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{l}</p>
                      <p className="text-slate-700 font-bold break-words">{value}</p>
                    </div>
                  </div>
                ))}

                {site && company.website && (
                  <div className="flex items-start gap-3.5 text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-[#0F9DE4] flex items-center justify-center shrink-0 shadow-xs">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Website</p>
                      <a href={site} target="_blank" rel="noopener noreferrer" className="text-[#0025B8] font-bold hover:underline break-all">
                        {company.website.replace(/^https?:\/\//i, '')}
                      </a>
                    </div>
                  </div>
                )}

                {info.length === 0 && !site && (
                  <p className="text-slate-400 text-xs font-medium">No additional overview details added.</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Link href="/jobs" className="inline-flex items-center gap-2 text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] transition-colors bg-white/80 px-5 py-3 rounded-2xl border border-sky-100 shadow-xs w-full justify-center">
                <ArrowLeft className="w-4 h-4" /> Back to All Job Listings
              </Link>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
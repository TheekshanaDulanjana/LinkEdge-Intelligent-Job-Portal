'use client';

import { ReactNode, useState } from 'react';
import {
  Briefcase, GraduationCap, Award, Check, X, Mail, Phone, MapPin, Globe, Code2, Layers,
  Sparkles, ShieldCheck, ChevronDown, FolderGit2, Languages, Link2, TrendingUp, AlertTriangle, Minus,
} from 'lucide-react';
import { CandidateAnalysisData, CandidateProfile } from '@/lib/candidates';
import { EmptyNote, Pill, ScoreRing, cx } from '@/components/enterprise/dashboard/primitives';

type Data = Extract<CandidateAnalysisData, { hasResume: true }>;

const label = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

function SectionTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <p className={cx(label, 'flex items-center gap-1.5')}>{icon}{children}</p>
      {aside}
    </div>
  );
}

function Meter({ name, value, hint }: { name: string; value: number; hint?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 80 ? 'bg-emerald-500' : v >= 60 ? 'bg-[#0084DA]' : v >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-slate-700">{name}</span>
        <span className="font-semibold text-slate-900 tabular-nums">{Math.round(v)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
        <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${v}%` }} />
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

const toneFor = (c: string) => (c === 'green' ? 'green' : c === 'blue' ? 'blue' : c === 'amber' ? 'amber' : 'rose') as 'green' | 'blue' | 'amber' | 'rose';

/* ───────────────────────── Overview ───────────────────────── */
export function OverviewTab({ d, profile, onOpenCv }: { d: Data; profile: CandidateProfile | null; onOpenCv: () => void }) {
  const { analysis: a, aiMatch: ai, ats, job } = d;
  const [showChecks, setShowChecks] = useState(false);
  const p = profile?.profile;
  const comp = ai.components;
  const exp = ats.breakdown;

  return (
    <div className="space-y-6">
      {/* AI match explanation */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ScoreRing value={ai.score} size={52} />
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#0084DA]" /> AI match for this role</p>
              <div className="flex items-center gap-2 mt-1"><Pill tone={toneFor(ai.color)}>{ai.label}</Pill><span className="text-xs font-semibold text-slate-600">{ai.recommendation}</span></div>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 mt-4">
          <Meter name="Skill fit" value={comp.skills} hint={`${ai.matched_skills.length} matched${ai.related_skills.length ? `, ${ai.related_skills.length} related` : ''}${ai.missing_skills.length ? `, ${ai.missing_skills.length} missing` : ''}`} />
          <Meter name="Role alignment" value={comp.role} hint="Job title vs. headline and recent roles" />
          <Meter name="Experience fit" value={comp.experience} hint={`${a.experience_years} yrs${job.experience_required ? ` vs ${job.experience_required} required` : ''}`} />
          <Meter name="Proven in real work" value={comp.evidence} hint="Skills used in roles and projects, not just listed" />
        </div>
        {(ai.strengths.length > 0 || ai.gaps.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-1.5"><TrendingUp className="w-3.5 h-3.5" /> Why it fits</p>
              {ai.strengths.length ? <ul className="space-y-1.5">{ai.strengths.map((s, i) => <li key={i} className="text-xs text-slate-600 flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{s}</li>)}</ul> : <p className="text-xs text-slate-300">Nothing stands out yet.</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Watch-outs</p>
              {ai.gaps.length ? <ul className="space-y-1.5">{ai.gaps.map((s, i) => <li key={i} className="text-xs text-slate-600 flex gap-2"><Minus className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />{s}</li>)}</ul> : <p className="text-xs text-slate-300">No gaps found.</p>}
            </div>
          </div>
        )}
      </section>

      {/* ATS breakdown */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <ScoreRing value={ats.overall_score} size={52} />
          <div>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#0063CE]" /> ATS score</p>
            <p className="text-xs text-slate-600 mt-0.5">How closely the CV matches the posted requirements</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 mt-4">
          <Meter name="Technical skills" value={exp.technical_score} hint={exp.explanation?.technical} />
          <Meter name="Experience" value={exp.experience_score} hint={exp.explanation?.experience} />
          <Meter name="Education" value={exp.education_score} hint={exp.explanation?.education} />
          <Meter name="Certifications" value={exp.certification_score} hint={exp.explanation?.certification} />
          <Meter name="Keyword relevance" value={exp.keyword_score} hint={exp.explanation?.keyword} />
        </div>
      </section>

      {/* Profile snapshot */}
      <section>
        <SectionTitle>Profile</SectionTitle>
        {(a.summary || p?.professionalSummary) ? (
          <p className="text-[13px] text-slate-600 leading-relaxed">{a.summary || p?.professionalSummary}</p>
        ) : <p className="text-xs text-slate-300">No summary on the CV or profile.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 text-xs">
          <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-slate-500">Headline</p><p className="font-semibold text-slate-800 mt-0.5 leading-snug">{a.headline || p?.interestArea || '–'}</p></div>
          <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-slate-500">Seniority</p><p className="font-semibold text-slate-800 mt-0.5">{a.seniority}</p></div>
          <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-slate-500">Experience</p><p className="font-semibold text-slate-800 mt-0.5">{a.experience_years > 0 ? `${a.experience_years} yrs` : 'Entry level'}</p></div>
          <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-slate-500">Top education</p><p className="font-semibold text-slate-800 mt-0.5">{a.education[0]?.degree || '–'}</p></div>
        </div>
      </section>

      <section>
        <SectionTitle>Contact and links</SectionTitle>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { i: <Mail className="w-3.5 h-3.5" />, v: a.contact.email, href: a.contact.email ? `mailto:${a.contact.email}` : '' },
            { i: <Phone className="w-3.5 h-3.5" />, v: a.contact.phone || p?.phone || '', href: '' },
            { i: <MapPin className="w-3.5 h-3.5" />, v: a.location || p?.location || '', href: '' },
            { i: <Link2 className="w-3.5 h-3.5" />, v: a.contact.linkedin, href: a.contact.linkedin ? (a.contact.linkedin.startsWith('http') ? a.contact.linkedin : `https://${a.contact.linkedin}`) : '' },
            { i: <Code2 className="w-3.5 h-3.5" />, v: a.contact.github || p?.githubUrl || '', href: a.contact.github ? (a.contact.github.startsWith('http') ? a.contact.github : `https://${a.contact.github}`) : (p?.githubUrl ?? '') },
            { i: <Globe className="w-3.5 h-3.5" />, v: a.contact.links[0] || p?.websiteUrl || '', href: a.contact.links[0] ? (a.contact.links[0].startsWith('http') ? a.contact.links[0] : `https://${a.contact.links[0]}`) : (p?.websiteUrl ?? '') },
          ].filter(x => x.v).map((x, i) => x.href ? (
            <a key={i} href={x.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-slate-700 hover:border-[#0084DA] hover:text-[#0063CE] transition-colors max-w-full"><span className="text-slate-500">{x.i}</span><span className="truncate">{x.v}</span></a>
          ) : (
            <span key={i} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-slate-700"><span className="text-slate-500">{x.i}</span>{x.v}</span>
          ))}
        </div>
      </section>

      {/* CV health */}
      <section className="rounded-2xl border border-slate-200">
        <button onClick={() => setShowChecks(v => !v)} className="w-full flex items-center justify-between gap-3 p-4 cursor-pointer text-left">
          <div className="flex items-center gap-3">
            <ScoreRing value={a.cv_health.score} size={40} />
            <div>
              <p className="text-[13px] font-semibold text-slate-900">CV quality check</p>
              <p className="text-xs text-slate-500">{a.cv_health.checks.filter(c => c.passed).length} of {a.cv_health.checks.length} checks passed · parser read {a.parse_confidence}% of key fields</p>
            </div>
          </div>
          <ChevronDown className={cx('w-4 h-4 text-slate-500 transition-transform', showChecks && 'rotate-180')} />
        </button>
        {showChecks && (
          <ul className="px-4 pb-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
            {a.cv_health.checks.map(c => (
              <li key={c.id} className="flex gap-2 text-xs">
                {c.passed ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                <span><span className="text-slate-700">{c.label}</span><span className="block text-xs text-slate-500">{c.detail}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-500 leading-relaxed">
        Read from the uploaded CV by a rule-based parser (no guesswork from an AI model). Scanned image PDFs and unusual layouts can be read incompletely, so open the original CV for anything important.
        <button onClick={onOpenCv} className="ml-1 font-semibold text-[#0063CE] hover:underline cursor-pointer">Open CV</button>
      </p>
    </div>
  );
}

/* ───────────────────────── Experience ───────────────────────── */
export function ExperienceTab({ d }: { d: Data }) {
  const { analysis: a } = d;
  if (!a.experience.length) return <EmptyNote text="No work experience could be read from this CV." icon={<Briefcase className="w-6 h-6" />} />;
  const totalRoles = a.experience.length;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-600">
        <Pill tone="blue">{a.experience_years} yrs total</Pill><span>{totalRoles} role{totalRoles === 1 ? '' : 's'}, overlapping jobs counted once</span>
      </div>
      <ol className="relative border-l border-slate-200 ml-2 space-y-6">
        {a.experience.map((e, i) => (
          <li key={i} className="pl-5 relative">
            <span className={cx('absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white', e.current ? 'bg-emerald-500' : 'bg-[#0084DA]')} />
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900">{e.title || 'Role'}{e.current && <span className="ml-2 align-middle"><Pill tone="green">Current</Pill></span>}</p>
                <p className="text-xs text-slate-600 mt-0.5">{[e.company, e.location, e.employment_type].filter(Boolean).join(' · ') || <span className="text-slate-300">Company not detected</span>}</p>
              </div>
              <div className="text-right text-xs text-slate-500 shrink-0">
                <p className="font-medium text-slate-600">{e.duration || 'Dates not found'}</p>
                {e.duration_label && <p>{e.duration_label}</p>}
              </div>
            </div>
            {e.bullets.length > 0 ? (
              <ul className="mt-2 space-y-1.5">{e.bullets.map((b, k) => <li key={k} className="text-xs text-slate-600 leading-relaxed flex gap-2"><span className="text-slate-300 mt-0.5">•</span><span>{b}</span></li>)}</ul>
            ) : e.description ? <p className="text-xs text-slate-600 leading-relaxed mt-1.5">{e.description}</p> : null}
            {e.skills.length > 0 && <div className="flex flex-wrap gap-1 mt-2.5">{e.skills.map(s => <span key={s} className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{s}</span>)}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────────────────── Education ───────────────────────── */
export function EducationTab({ d }: { d: Data }) {
  const { analysis: a, job } = d;
  if (!a.education.length) return <EmptyNote text="No education could be read from this CV." icon={<GraduationCap className="w-6 h-6" />} />;
  return (
    <div className="space-y-3">
      {job.education_required && (
        <p className="text-xs text-slate-600">This job asks for: <b className="text-slate-700">{job.education_required}</b> level. ATS education score: <b className="text-slate-700">{Math.round(d.ats.breakdown.education_score)}%</b></p>
      )}
      {a.education.map((e, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-slate-200 p-4">
          <span className="w-10 h-10 rounded-lg bg-slate-50 text-[#0063CE] flex items-center justify-center shrink-0"><GraduationCap className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-slate-900">{e.degree_title || e.degree || 'Qualification'}</p>
              {e.degree && <Pill tone="blue">{e.degree}</Pill>}
              {e.in_progress && <Pill tone="amber">In progress</Pill>}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">{e.institution || <span className="text-slate-300">Institution not detected</span>}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
              {e.field && <span>Field: <b className="text-slate-700">{e.field}</b></span>}
              {(e.start_year || e.year) && <span>{[e.start_year, e.year].filter(Boolean).join(' – ')}</span>}
              {e.grade && <span>Result: <b className="text-slate-700">{e.grade}</b></span>}
            </div>
            {e.notes && <p className="text-xs text-slate-500 mt-1.5">{e.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Skills ───────────────────────── */
export function SkillsTab({ d }: { d: Data }) {
  const { analysis: a, aiMatch: ai, job } = d;
  const used = new Map(a.skill_items.map(s => [s.name, s.in_experience]));
  const have = new Set(a.skills.map(s => s.toLowerCase()));
  const relatedHave = new Map(ai.related_skills.map(r => [r.required.toLowerCase(), r.has]));
  const required = job.required_skills;
  const preferred = job.preferred_skills;

  const Chip = ({ s }: { s: string }) => {
    const n = used.get(s) ?? 0;
    return (
      <span title={n > 0 ? `Used in ${n} role/project` : 'Listed, not shown in a role'} className={cx('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md', n > 0 ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>
        {s}{n > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#0084DA]" />}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {(required.length > 0 || preferred.length > 0) && (
        <section className="rounded-2xl border border-slate-200 p-4">
          <SectionTitle icon={<Layers className="w-3.5 h-3.5" />}>Fit against this job</SectionTitle>
          {required.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-600 mb-1.5">Required ({ai.matched_skills.length} of {required.length} matched)</p>
              <div className="flex flex-wrap gap-1.5">
                {required.map(s => {
                  const ok = have.has(s.toLowerCase());
                  const rel = !ok ? relatedHave.get(s.toLowerCase()) : undefined;
                  return (
                    <span key={s} className={cx('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border',
                      ok ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : rel ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100')}>
                      {ok ? <Check className="w-3 h-3" /> : rel ? <Minus className="w-3 h-3" /> : <X className="w-3 h-3" />}{s}{rel && <span className="font-normal">(has {rel})</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {preferred.length > 0 && (
            <div>
              <p className="text-xs text-slate-600 mb-1.5">Nice to have</p>
              <div className="flex flex-wrap gap-1.5">{preferred.map(s => {
                const ok = have.has(s.toLowerCase());
                return <span key={s} className={cx('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border', ok ? 'bg-emerald-50 text-emerald-700 border-emerald-100 font-medium' : 'bg-white text-slate-500 border-slate-200')}>{ok && <Check className="w-3 h-3" />}{s}</span>;
              })}</div>
            </div>
          )}
        </section>
      )}

      <section>
        <SectionTitle icon={<Code2 className="w-3.5 h-3.5" />} aside={<span className="text-xs text-slate-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0084DA]" /> used in a role or project</span>}>
          Technical skills ({a.skills.length})
        </SectionTitle>
        {a.skills.length === 0 ? <p className="text-xs text-slate-300">No skills recognised.</p> : (
          <div className="space-y-3.5">
            {Object.entries(a.skills_by_category).map(([cat, list]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">{cat}</p>
                <div className="flex flex-wrap gap-1.5">{list.map(s => <Chip key={s} s={s} />)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {a.additional_skills.length > 0 && (
        <section>
          <SectionTitle>Also listed on the CV</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{a.additional_skills.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600">{s}</span>)}</div>
        </section>
      )}

      {a.soft_skills.length > 0 && (
        <section>
          <SectionTitle>Professional skills</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{a.soft_skills.map(s => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-md bg-violet-50 text-violet-700">{s}</span>)}</div>
        </section>
      )}

      <section>
        <SectionTitle icon={<Award className="w-3.5 h-3.5" />}>Certifications ({a.certifications.length})</SectionTitle>
        {a.certifications.length === 0 ? <p className="text-xs text-slate-300">None listed.</p> : (
          <ul className="space-y-2">{a.certifications.map((c, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5">
              <span className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Award className="w-4 h-4" /></span>
              <div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{c.name}</p>{(c.issuer || c.year) && <p className="text-xs text-slate-500">{[c.issuer, c.year].filter(Boolean).join(' · ')}</p>}</div>
            </li>))}
          </ul>
        )}
      </section>

      {a.projects.length > 0 && (
        <section>
          <SectionTitle icon={<FolderGit2 className="w-3.5 h-3.5" />}>Projects ({a.projects.length})</SectionTitle>
          <ul className="space-y-2.5">{a.projects.map((p, i) => (
            <li key={i} className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-xs font-semibold text-slate-800">{p.name}</p>
              {p.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{p.description}</p>}
              {p.skills.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{p.skills.map(s => <span key={s} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{s}</span>)}</div>}
            </li>))}
          </ul>
        </section>
      )}

      {a.languages.length > 0 && (
        <section>
          <SectionTitle icon={<Languages className="w-3.5 h-3.5" />}>Languages</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{a.languages.map(l => <span key={l} className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">{l}</span>)}</div>
        </section>
      )}
    </div>
  );
}

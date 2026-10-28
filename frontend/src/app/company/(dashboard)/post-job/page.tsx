'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { jobApi } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import {
  Trash2, Plus, Bold, Italic, Link as LinkIcon, List, Send, Sparkles, Briefcase, CheckCircle2, MapPin, Banknote, CalendarClock, X,
} from 'lucide-react';
import { Panel, Pill, cx } from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, Field, Toast, useHideFooter, inputCls, selectCls, textareaCls, btnPrimary, btnSecondary, iconBtn,
} from '@/components/enterprise/dashboard/kit';

const TEXT_CHARS = /^[\p{L}\p{M}\p{N} &/+#.,()'’\-–]+$/u;
const schema = z.object({
  title: z.string().trim().min(3, 'Job title must be at least 3 characters').max(100, 'Job title must be at most 100 characters')
    .regex(TEXT_CHARS, 'Job title contains characters that are not allowed').regex(/\p{L}/u, 'Job title must contain letters'),
  department: z.string().min(1, 'Department is required'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']),
  experienceLevel: z.string().min(1, 'Experience level is required'),
  locationType: z.enum(['REMOTE', 'ON_SITE', 'HYBRID']),
  location: z.string().trim().min(2, 'Office location is required').max(100, 'Location must be at most 100 characters')
    .regex(TEXT_CHARS, 'Location contains characters that are not allowed'),
  salaryMin: z.string().regex(/^\d{0,9}$/, 'Numbers only (max 9 digits)').optional(),
  salaryMax: z.string().regex(/^\d{0,9}$/, 'Numbers only (max 9 digits)').optional(),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(10000, 'Description must be at most 10,000 characters'),
  deadline: z.string().min(1, 'Deadline required').refine(v => {
    const d = new Date(v); const max = Date.now() + 2 * 366 * 86400000;
    return !Number.isNaN(d.getTime()) && d.getTime() <= max;
  }, 'Deadline is too far ahead (max 2 years)'),
}).refine(d => !d.salaryMin || !d.salaryMax || Number(d.salaryMin) <= Number(d.salaryMax), {
  message: 'Maximum salary must be at least the minimum',
  path: ['salaryMax'],
});

type FormData = z.infer<typeof schema>;

const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Operations', 'Finance', 'Human Resources', 'Customer Support', 'Other'];
const SKILL_SUGGESTIONS = ['React', 'TypeScript', 'Node.js', 'Python', 'SQL', 'Figma', 'AWS', 'Docker', 'Java', 'Communication'];
const SECTIONS = [
  { id: 'basic-info', label: 'Basics' },
  { id: 'location-salary', label: 'Location and salary' },
  { id: 'job-description', label: 'Description' },
  { id: 'requirements', label: 'Requirements and skills' },
];

const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

function PostJobPageContent() {
  useHideFooter();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState<'ACTIVE' | 'DRAFT' | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [companyName, setCompanyName] = useState('Company');
  const [companyLogo, setCompanyLogo] = useState('');

  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [requirementsList, setRequirementsList] = useState<string[]>(['']);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [autoScreen, setAutoScreen] = useState(true);
  const [minMatch, setMinMatch] = useState(35);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: 'Engineering', jobType: 'FULL_TIME', experienceLevel: 'Entry Level',
      locationType: 'ON_SITE', location: 'Colombo, Sri Lanka', description: '',
    },
  });

  useEffect(() => {
    api.get('/auth/me').then(res => {
      const p = res.data?.data?.profile || res.data?.company || res.data?.profile;
      if (p?.companyName) setCompanyName(p.companyName);
      if (p?.logoUrl) setCompanyLogo(assetUrl(p.logoUrl));
    }).catch(err => console.error('Failed to load company info', err));
  }, []);

  // Highlight the section currently in view
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { rootMargin: '-20% 0px -65% 0px' });
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const w = watch();
  const cleanResp = responsibilities.filter(r => r.trim());
  const cleanReq = requirementsList.filter(r => r.trim());

  const checklist = useMemo(() => [
    { label: 'Job title', done: (w.title ?? '').trim().length >= 3 },
    { label: 'Deadline', done: !!w.deadline },
    { label: 'Salary range', done: !!w.salaryMin && !!w.salaryMax },
    { label: 'Description (20+ chars)', done: (w.description ?? '').trim().length >= 20 },
    { label: 'Responsibilities', done: cleanResp.length > 0 },
    { label: 'Requirements', done: cleanReq.length > 0 },
    { label: 'Skills', done: skills.length > 0 },
  ], [w.title, w.deadline, w.salaryMin, w.salaryMax, w.description, cleanResp.length, cleanReq.length, skills.length]);
  const done = checklist.filter(c => c.done).length;

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const ta = document.getElementById('job-description-textarea') as HTMLTextAreaElement | null;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    setValue('description', `${value.slice(0, s)}${prefix}${value.slice(s, e) || 'text'}${suffix}${value.slice(e)}`, { shouldDirty: true });
  };

  const updateAt = (list: string[], set: (l: string[]) => void, i: number, v: string) => { const n = [...list]; n[i] = v; set(n); };
  const addSkill = (raw: string) => {
    const s = raw.replace(/[^\p{L}\p{M}\p{N} .+#/&'\-()]/gu, '').trim().slice(0, 40);
    if (!s) return;
    if (skills.length >= 30) { setServerError('You can add at most 30 skills.'); return; }
    if (!skills.some(x => x.toLowerCase() === s.toLowerCase())) setSkills([...skills, s]);
  };

  async function submitJob(data: FormData, status: 'ACTIVE' | 'DRAFT') {
    setServerError('');
    if (cleanReq.length === 0) { setServerError('Add at least one requirement so candidates can be matched.'); return; }
    setLoading(status);
    try {
      await jobApi.post('/jobs', {
        ...data,
        status,
        responsibilities: cleanResp,
        requirementsList: cleanReq,
        requirements: cleanReq.join('. '), // legacy flat string, backend also derives this itself
        skills,
        autoScreen,
        minMatchScore: minMatch,
        salaryMin: data.salaryMin ? parseInt(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? parseInt(data.salaryMax) : undefined,
      });
      setToast({ type: 'ok', msg: status === 'ACTIVE' ? 'Job published.' : 'Draft saved.' });
      setTimeout(() => router.push('/company/jobs'), 700);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e.response?.data?.message || 'Failed to post the job.');
      setLoading(null);
    }
  }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const ListEditor = ({ items, setItems, placeholder, addLabel }: { items: string[]; setItems: (l: string[]) => void; placeholder: string; addLabel: string }) => (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F9DE4] shrink-0" />
          <input value={v} maxLength={300} onChange={e => updateAt(items, setItems, i, e.target.value)} placeholder={placeholder} className={inputCls} />
          {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, k) => k !== i))} className={cx(iconBtn, 'hover:!bg-rose-50 hover:!text-rose-600')} aria-label="Remove"><Trash2 className="w-4 h-4" /></button>}
        </div>
      ))}
      {items.length < 30 && <button type="button" onClick={() => setItems([...items, ''])} className="text-xs font-semibold text-[#0025B8] hover:underline inline-flex items-center gap-1.5 cursor-pointer pt-1"><Plus className="w-3.5 h-3.5" />{addLabel}</button>}
    </div>
  );

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        eyebrow="Recruitment"
        title="Post a job"
        description="Describe the role. The more specific you are, the better Smart Rank can match candidates."
        actions={<>
          <Link href="/company/jobs" className={btnSecondary}>Cancel</Link>
          <button type="button" disabled={!!loading} onClick={handleSubmit(d => submitJob(d, 'DRAFT'))} className={btnSecondary}>{loading === 'DRAFT' ? 'Saving…' : 'Save draft'}</button>
          <button type="button" disabled={!!loading} onClick={handleSubmit(d => submitJob(d, 'ACTIVE'))} className={btnPrimary}><Send className="w-3.5 h-3.5" />{loading === 'ACTIVE' ? 'Publishing…' : 'Publish job'}</button>
        </>}
      />

      {serverError && <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">{serverError}</div>}
      {Object.keys(errors).length > 0 && <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800">Some fields need attention. Check the highlighted messages below.</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <nav className="xl:col-span-2 hidden xl:block sticky top-24">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 mb-2 px-3">Sections</p>
          <ul className="space-y-0.5">
            {SECTIONS.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={cx('block px-3 py-2 text-xs font-semibold rounded-lg border-l-2 transition-colors',
                  activeSection === s.id ? 'border-[#0025B8] bg-white text-[#0025B8] shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-white')}>{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="xl:col-span-6 space-y-4">
          <div id="basic-info" className="scroll-mt-24">
            <Panel title="Basics" subtitle="Title, type and deadline" icon={<Briefcase className="w-3.5 h-3.5" />}>
              <div className="space-y-4">
                <Field label="Job title" required error={errors.title?.message}><input maxLength={100} placeholder="e.g. Senior Full-Stack Engineer" className={inputCls} {...register('title')} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Department"><select {...register('department')} className={selectCls}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
                  <Field label="Employment type"><select {...register('jobType')} className={selectCls}>
                    {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'].map(t => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
                  <Field label="Experience level"><select {...register('experienceLevel')} className={selectCls}>
                    {['Entry Level', 'Mid Level', 'Senior Level'].map(t => <option key={t}>{t}</option>)}</select></Field>
                  <Field label="Application deadline" required error={errors.deadline?.message}><input type="date" min={minDate} className={inputCls} {...register('deadline')} /></Field>
                </div>
              </div>
            </Panel>
          </div>

          <div id="location-salary" className="scroll-mt-24">
            <Panel title="Location and salary" subtitle="Roles with a visible salary get more applications" icon={<MapPin className="w-3.5 h-3.5" />}>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">Work arrangement</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ v: 'ON_SITE', l: 'On-site' }, { v: 'HYBRID', l: 'Hybrid' }, { v: 'REMOTE', l: 'Remote' }].map(o => (
                      <label key={o.v} className={cx('flex items-center justify-center h-9 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                        w.locationType === o.v ? 'border-[#0025B8] bg-blue-50 text-[#0025B8]' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                        <input type="radio" value={o.v} {...register('locationType')} className="sr-only" />{o.l}
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Office location" required error={errors.location?.message}><input maxLength={100} placeholder="Colombo, Sri Lanka" className={inputCls} {...register('location')} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Minimum salary" hint="LKR / month" error={errors.salaryMin?.message}><input inputMode="numeric" maxLength={9} placeholder="150000" className={inputCls} {...register('salaryMin', { onChange: e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9); } })} /></Field>
                  <Field label="Maximum salary" hint="LKR / month" error={errors.salaryMax?.message}><input inputMode="numeric" maxLength={9} placeholder="250000" className={inputCls} {...register('salaryMax', { onChange: e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9); } })} /></Field>
                </div>
              </div>
            </Panel>
          </div>

          <div id="job-description" className="scroll-mt-24">
            <Panel title="Description" subtitle="What the role is and who it is for" icon={<Sparkles className="w-3.5 h-3.5" />}>
              <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0F9DE4]/25 focus-within:border-[#0F9DE4] transition-colors">
                <div className="bg-slate-50 px-2 py-1.5 border-b border-slate-200 flex items-center gap-0.5">
                  {[
                    { i: <Bold className="w-4 h-4" />, f: () => applyFormat('**'), t: 'Bold' },
                    { i: <Italic className="w-4 h-4" />, f: () => applyFormat('*'), t: 'Italic' },
                    { i: <LinkIcon className="w-4 h-4" />, f: () => applyFormat('[', '](https://)'), t: 'Link' },
                    { i: <List className="w-4 h-4" />, f: () => applyFormat('\n- ', ''), t: 'Bullet' },
                  ].map(b => <button key={b.t} type="button" title={b.t} onClick={b.f} className={iconBtn}>{b.i}</button>)}
                  <span className="ml-auto text-[11px] text-slate-400 pr-2 tabular-nums">{(w.description ?? '').length} chars</span>
                </div>
                <textarea id="job-description-textarea" rows={8} maxLength={10000} placeholder="Describe the role, the team and the impact this person will have." {...register('description')}
                  className="w-full p-3 text-[13px] focus:outline-none resize-y bg-white text-slate-800" />
              </div>
              {errors.description && <p className="text-[11px] text-rose-600 font-medium mt-1.5">{errors.description.message}</p>}
            </Panel>
          </div>

          <div id="requirements" className="scroll-mt-24">
            <Panel title="Requirements and skills" subtitle="Smart Rank compares CVs against these" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Responsibilities</p>
                  <ListEditor items={responsibilities} setItems={setResponsibilities} placeholder="e.g. Design and ship new product features" addLabel="Add responsibility" />
                </div>
                <div className="pt-5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Requirements</p>
                  <ListEditor items={requirementsList} setItems={setRequirementsList} placeholder="e.g. 3+ years of frontend experience" addLabel="Add requirement" />
                </div>
                <div className="pt-5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Required skills</p>
                  <div className="border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1.5 items-center min-h-[42px] focus-within:ring-2 focus-within:ring-[#0F9DE4]/25 focus-within:border-[#0F9DE4]">
                    {skills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-md">
                        {s}<button type="button" onClick={() => setSkills(skills.filter(x => x !== s))} className="text-slate-400 hover:text-rose-600 cursor-pointer" aria-label={`Remove ${s}`}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <input value={skillInput} maxLength={40} onChange={e => setSkillInput(e.target.value.replace(/[^\p{L}\p{M}\p{N} .+#/&'\-()]/gu, ''))}
                      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) { e.preventDefault(); addSkill(skillInput); setSkillInput(''); } if (e.key === 'Backspace' && !skillInput && skills.length) setSkills(skills.slice(0, -1)); }}
                      placeholder={skills.length ? 'Add another…' : 'Type a skill and press Enter'} className="flex-1 min-w-[140px] outline-none text-[13px] bg-transparent px-1.5 py-1" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {SKILL_SUGGESTIONS.filter(s => !skills.some(x => x.toLowerCase() === s.toLowerCase())).slice(0, 8).map(s => (
                      <button key={s} type="button" onClick={() => addSkill(s)} className="text-[11px] font-medium px-2 py-1 rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-[#0F9DE4] hover:text-[#0025B8] cursor-pointer transition-colors">+ {s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <aside className="xl:col-span-4 space-y-4 xl:sticky xl:top-24">
          <Panel title="Ready to publish?" subtitle={`${done} of ${checklist.length} complete`} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3.5"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(done / checklist.length) * 100}%` }} /></div>
            <ul className="space-y-1.5">
              {checklist.map(c => (
                <li key={c.label} className="flex items-center gap-2.5 text-xs">
                  <span className={cx('w-4 h-4 rounded-full flex items-center justify-center shrink-0', c.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300')}><CheckCircle2 className="w-3 h-3" /></span>
                  <span className={c.done ? 'text-slate-600' : 'text-slate-400'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Auto-screening" subtitle="Reject poor matches automatically" icon={<Sparkles className="w-3.5 h-3.5" />}>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={autoScreen} onChange={e => setAutoScreen(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0025B8]" />
              <span className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold text-slate-800">Screen applicants automatically.</span> Each CV is scored against this job. Candidates below the minimum are rejected by the system with an explanation. You can still shortlist or interview any of them.</span>
            </label>
            <div className={cx('mt-4 transition-opacity', !autoScreen && 'opacity-40 pointer-events-none')}>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="min-match" className="text-xs font-semibold text-slate-700">Minimum match</label>
                <span className="text-xs font-semibold text-[#0025B8] tabular-nums">{minMatch}%</span>
              </div>
              <input id="min-match" type="range" min={0} max={90} step={5} value={minMatch} onChange={e => setMinMatch(Number(e.target.value))} className="w-full accent-[#0025B8]" />
              <p className="text-[11px] text-slate-400 mt-1.5">{minMatch === 0 ? 'Nobody is rejected.' : minMatch <= 35 ? 'Lenient: only clearly unrelated CVs are rejected.' : minMatch <= 60 ? 'Balanced: CVs missing key requirements are rejected.' : 'Strict: only strong matches stay in the list.'}</p>
            </div>
          </Panel>

          <Panel title="Live preview" subtitle="As candidates will see it" icon={<Briefcase className="w-3.5 h-3.5" />}>
            <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                {companyLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={companyLogo} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
                  : <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] flex items-center justify-center text-white text-sm font-semibold">{companyName?.[0]?.toUpperCase() || 'C'}</span>}
                <div className="min-w-0"><p className="text-xs font-semibold text-slate-900 truncate">{companyName}</p><p className="text-[10.5px] font-semibold text-[#0F9DE4] uppercase tracking-wide">Hiring</p></div>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{w.title || 'Job title'}</h3>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone="blue">{label(w.jobType ?? '')}</Pill><Pill tone="sky">{label(w.locationType ?? '')}</Pill>
                {w.experienceLevel && <Pill tone="slate">{w.experienceLevel}</Pill>}
              </div>
              <div className="text-[11px] text-slate-500 space-y-1">
                <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{w.location || 'Location'}</p>
                <p className="flex items-center gap-1.5"><Banknote className="w-3 h-3" />{w.salaryMin || w.salaryMax ? `LKR ${Number(w.salaryMin || 0).toLocaleString()} – ${Number(w.salaryMax || 0).toLocaleString()}` : 'Salary not shown'}</p>
                <p className="flex items-center gap-1.5"><CalendarClock className="w-3 h-3" />{w.deadline ? `Apply by ${new Date(w.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'No deadline set'}</p>
              </div>
              {w.description && <p className="text-xs text-slate-600 line-clamp-4 whitespace-pre-wrap leading-relaxed pt-2 border-t border-slate-200">{w.description}</p>}
              {skills.length > 0 && <div className="flex flex-wrap gap-1">{skills.slice(0, 6).map(s => <span key={s} className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">{s}</span>)}{skills.length > 6 && <span className="text-[10.5px] text-slate-400 py-0.5">+{skills.length - 6}</span>}</div>}
            </div>
          </Panel>
        </aside>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

export default function PostJobPage() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <PostJobPageContent />
    </AuthGuard>
  );
}

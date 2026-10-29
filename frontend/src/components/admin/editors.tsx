'use client';

import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { errMsg } from '@/lib/admin';
import { assetUrl } from '@/lib/assetUrl';
import { ICON_NAMES } from '@/components/landing/icons';
import { cn } from '@/lib/utils';
import { Btn, Field, Select, TextArea, TextInput, inputCls, useToast } from './ui';

/** Public page where each content block can be previewed. */
export const PUBLIC_PATH: Record<string, string> = {
  hero: '/', whySeekers: '/', whyRecruiters: '/', careerPaths: '/', testimonials: '/', faq: '/',
  pageOverview: '/overview', pageSeeker: '/seeker', pageCompanies: '/companies',
};

/* ------------------------------------------------------------------ helpers */

type Setter<T> = (v: T) => void;

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= arr.length) return arr;
  const a = arr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a;
};

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <header className="px-5 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}
const Two = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;

function Reorder({ i, n, onMove, onRemove, removeLabel = 'Remove' }: { i: number; n: number; onMove: (to: number) => void; onRemove: () => void; removeLabel?: string }) {
  const b = 'p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer';
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button type="button" className={b} disabled={i === 0} onClick={() => onMove(i - 1)} aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
      <button type="button" className={b} disabled={i === n - 1} onClick={() => onMove(i + 1)} aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
      <button type="button" className={cn(b, 'hover:!bg-rose-50 hover:!text-rose-600')} onClick={onRemove} aria-label={removeLabel}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

/** A list of short texts (pills, bullet points). */
export function StringList({ label, items, onChange, max = 60, placeholder, addLabel = 'Add item' }: {
  label: string; items: string[]; onChange: Setter<string[]>; max?: number; placeholder?: string; addLabel?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1.5">{label} <span className="font-normal text-slate-400">({items.length})</span></p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={inputCls} aria-label={`${label} ${i + 1}`} />
            <Reorder i={i} n={items.length} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      <Btn size="sm" className="mt-2" disabled={items.length >= max} onClick={() => onChange([...items, ''])}><Plus className="w-3.5 h-3.5" />{addLabel}</Btn>
    </div>
  );
}

/** A list of cards, each with its own fields. */
export function ObjectList<T>({ label, items, onChange, create, title, children, max = 40, addLabel = 'Add' }: {
  label: string; items: T[]; onChange: Setter<T[]>; create: () => T; title: (item: T, i: number) => string;
  children: (item: T, set: (patch: Partial<T>) => void, i: number) => React.ReactNode; max?: number; addLabel?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-2">{label} <span className="font-normal text-slate-400">({items.length})</span></p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-slate-200 rounded-lg bg-slate-50/60">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-600 truncate">#{i + 1} · {title(item, i) || 'Untitled'}</p>
              <Reorder i={i} n={items.length} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
            <div className="p-3 space-y-3">{children(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}</div>
          </div>
        ))}
      </div>
      <Btn size="sm" className="mt-3" disabled={items.length >= max} onClick={() => onChange([...items, create()])}><Plus className="w-3.5 h-3.5" />{addLabel}</Btn>
    </div>
  );
}

/** Image upload (JPG, PNG or WEBP, up to 5 MB). Stores the uploaded file's URL. */
export function ImageField({ label, value, onChange }: { label: string; value: string; onChange: Setter<string> }) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const res = await adminApi.post('/content/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(res.data.data.url);
    } catch (e) { toast('error', errMsg(e)); }
    finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }
  const src = assetUrl(value);
  return (
    <Field label={label} hint="JPG, PNG or WEBP, up to 5 MB. Shown as a round photo.">
      <div className="flex items-center gap-3">
        {src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
          : <span className="w-12 h-12 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400"><ImagePlus className="w-5 h-5" /></span>}
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        <Btn size="sm" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}{value ? 'Replace' : 'Upload'}</Btn>
        {value && <Btn size="sm" variant="ghost" onClick={() => onChange('')}><X className="w-3.5 h-3.5" />Remove</Btn>}
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ editors */

interface P<T> { value: T; onChange: Setter<T> }
/* eslint-disable @typescript-eslint/no-explicit-any */
type V = any;

function HeroEditor({ value: v, onChange }: P<V>) {
  const set = (patch: Partial<V>) => onChange({ ...v, ...patch });
  return (<>
    <Group title="Headline" hint="The big text at the top of the home page.">
      <TextInput label="Badge" value={v.badge} onChange={(e) => set({ badge: e.target.value })} maxLength={80} />
      <Two>
        <TextInput label="Title - first line" value={v.titleLine1} onChange={(e) => set({ titleLine1: e.target.value })} maxLength={80} />
        <TextInput label="Title - second line (highlighted)" value={v.titleLine2} onChange={(e) => set({ titleLine2: e.target.value })} maxLength={80} />
      </Two>
      <TextArea label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={500} />
    </Group>
    <Group title="Buttons">
      <Two>
        <TextInput label="Main button - text" value={v.primaryButton.label} onChange={(e) => set({ primaryButton: { ...v.primaryButton, label: e.target.value } })} maxLength={30} />
        <TextInput label="Main button - link" value={v.primaryButton.href} onChange={(e) => set({ primaryButton: { ...v.primaryButton, href: e.target.value } })} hint="Example: /jobs" />
        <TextInput label="Second button - text" value={v.secondaryButton.label} onChange={(e) => set({ secondaryButton: { ...v.secondaryButton, label: e.target.value } })} maxLength={30} />
        <TextInput label="Second button - link" value={v.secondaryButton.href} onChange={(e) => set({ secondaryButton: { ...v.secondaryButton, href: e.target.value } })} hint="Example: /register?role=company" />
      </Two>
    </Group>
    <Group title="Career paths card" hint="The small card on the right of the hero. Each path links to a job search.">
      <Two>
        <TextInput label="Card title" value={v.pathsTitle} onChange={(e) => set({ pathsTitle: e.target.value })} maxLength={40} />
        <TextInput label="Card subtitle" value={v.pathsSubtitle} onChange={(e) => set({ pathsSubtitle: e.target.value })} maxLength={40} />
      </Two>
      <StringList label="Career paths" items={v.paths} onChange={(paths) => set({ paths })} max={30} placeholder="e.g. Data Scientist" addLabel="Add career path" />
    </Group>
  </>);
}

function WhyEditor({ value: v, onChange }: P<V>) {
  const set = (patch: Partial<V>) => onChange({ ...v, ...patch });
  return (<>
    <Group title="Heading">
      <Two>
        <TextInput label="Small tag" value={v.tag} onChange={(e) => set({ tag: e.target.value })} maxLength={40} />
        <TextInput label="Title" value={v.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} />
        <TextInput label="“Learn more” link" value={v.learnMoreUrl} onChange={(e) => set({ learnMoreUrl: e.target.value })} />
        <TextInput label="“Register” link" value={v.registerUrl} onChange={(e) => set({ registerUrl: e.target.value })} />
      </Two>
    </Group>
    <Group title="Points" hint="Each point has an icon, a short title and a description.">
      <ObjectList label="Points" items={v.features} onChange={(features) => set({ features })} max={8} addLabel="Add point"
        create={() => ({ icon: 'Sparkles', title: '', description: '' })} title={(f: V) => f.title}>
        {(f: V, s: (p: Partial<V>) => void) => (<>
          <Two>
            <TextInput label="Title" value={f.title} onChange={(e) => s({ title: e.target.value })} maxLength={60} />
            <Select label="Icon" value={f.icon} onChange={(e) => s({ icon: e.target.value })}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</Select>
          </Two>
          <TextArea label="Description" value={f.description} onChange={(e) => s({ description: e.target.value })} maxLength={300} />
        </>)}
      </ObjectList>
    </Group>
  </>);
}

function CareerPathsEditor({ value: v, onChange }: P<V>) {
  const set = (patch: Partial<V>) => onChange({ ...v, ...patch });
  return (<>
    <Group title="Heading">
      <Two>
        <TextInput label="Small tag" value={v.tag} onChange={(e) => set({ tag: e.target.value })} maxLength={40} />
        <TextInput label="Title" value={v.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} />
      </Two>
      <TextArea label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} />
    </Group>
    <Group title="Career paths" hint="Each one is a clickable pill that opens a job search.">
      <StringList label="Career paths" items={v.paths} onChange={(paths) => set({ paths })} max={60} placeholder="e.g. Cloud Engineer" addLabel="Add career path" />
    </Group>
  </>);
}

function TestimonialsEditor({ value: v, onChange }: P<V>) {
  const set = (patch: Partial<V>) => onChange({ ...v, ...patch });
  return (<>
    <Group title="Heading" hint="Shown on the left of the feedback section.">
      <TextInput label="Small tag" value={v.tag} onChange={(e) => set({ tag: e.target.value })} maxLength={50} />
      <Two>
        <TextInput label="Title - first line" value={v.titleLine1} onChange={(e) => set({ titleLine1: e.target.value })} maxLength={60} />
        <TextInput label="Title - second line (highlighted)" value={v.titleLine2} onChange={(e) => set({ titleLine2: e.target.value })} maxLength={60} />
      </Two>
      <TextArea label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} />
    </Group>
    <Group title="Feedback cards" hint="Add as many as you like. They scroll automatically in two rows on the public page.">
      <ObjectList label="Feedback" items={v.items} onChange={(items) => set({ items })} max={40} addLabel="Add feedback"
        create={() => ({ category: 'JOB SEEKER', name: '', designation: '', feedback: '', image: '' })} title={(t: V) => t.name}>
        {(t: V, s: (p: Partial<V>) => void) => (<>
          <Two>
            <Field label="Category" hint="Pick one or type your own">
              <input list="feedback-categories" value={t.category} onChange={(e) => s({ category: e.target.value })} maxLength={30} className={inputCls} />
              <datalist id="feedback-categories"><option value="JOB SEEKER" /><option value="RECRUITER" /><option value="COMPANY" /><option value="STUDENT" /></datalist>
            </Field>
            <TextInput label="Name" value={t.name} onChange={(e) => s({ name: e.target.value })} maxLength={60} />
            <TextInput label="Designation" value={t.designation} onChange={(e) => s({ designation: e.target.value })} maxLength={80} hint="Example: Software Engineer at Virtusa" />
            <ImageField label="Photo (optional)" value={t.image} onChange={(image) => s({ image })} />
          </Two>
          <TextArea label="Feedback" rows={4} value={t.feedback} onChange={(e) => s({ feedback: e.target.value })} maxLength={500} hint={`${t.feedback.length}/500`} />
        </>)}
      </ObjectList>
    </Group>
  </>);
}

function FaqEditor({ value: v, onChange }: P<V>) {
  const set = (patch: Partial<V>) => onChange({ ...v, ...patch });
  return (<>
    <Group title="Heading">
      <Two>
        <TextInput label="Small tag" value={v.tag} onChange={(e) => set({ tag: e.target.value })} maxLength={40} />
        <TextInput label="Title" value={v.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} />
      </Two>
      <TextArea label="Description" value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={300} />
    </Group>
    <Group title="Questions">
      <ObjectList label="Questions" items={v.items} onChange={(items) => set({ items })} max={30} addLabel="Add question"
        create={() => ({ question: '', answer: '' })} title={(q: V) => q.question}>
        {(q: V, s: (p: Partial<V>) => void) => (<>
          <TextInput label="Question" value={q.question} onChange={(e) => s({ question: e.target.value })} maxLength={200} />
          <TextArea label="Answer" rows={4} value={q.answer} onChange={(e) => s({ answer: e.target.value })} maxLength={1000} />
        </>)}
      </ObjectList>
    </Group>
  </>);
}

function PageEditor({ value: v, onChange }: P<V>) {
  const set = (patch: Partial<V>) => onChange({ ...v, ...patch });
  return (<>
    <Group title="Page header" hint="The blue banner at the top of the page.">
      <TextInput label="Small tag" value={v.heroTag} onChange={(e) => set({ heroTag: e.target.value })} maxLength={60} />
      <TextInput label="Title" value={v.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} maxLength={120} />
      <TextArea label="Description" value={v.heroDescription} onChange={(e) => set({ heroDescription: e.target.value })} maxLength={300} />
    </Group>
    <Group title="Benefit sections" hint="Shown one after another, alternating image left and right.">
      <ObjectList label="Sections" items={v.sections} onChange={(sections) => set({ sections })} max={6} addLabel="Add section"
        create={() => ({ tag: '', title: '', description: '', points: [''] })} title={(x: V) => x.title}>
        {(x: V, s: (p: Partial<V>) => void) => (<>
          <Two>
            <TextInput label="Small tag" value={x.tag} onChange={(e) => s({ tag: e.target.value })} maxLength={60} hint="Example: 01. Intelligent Matching" />
            <TextInput label="Title" value={x.title} onChange={(e) => s({ title: e.target.value })} maxLength={160} />
          </Two>
          <TextArea label="Description" rows={3} value={x.description} onChange={(e) => s({ description: e.target.value })} maxLength={500} />
          <StringList label="Bullet points" items={x.points} onChange={(points) => s({ points })} max={8} addLabel="Add bullet point" />
        </>)}
      </ObjectList>
    </Group>
  </>);
}

function OverviewEditor({ value: v, onChange }: P<V>) {
  const set = (key: string, patch: Partial<V>) => onChange({ ...v, [key]: { ...v[key], ...patch } });
  return (<>
    <Group title="Page header">
      <TextInput label="Badge" value={v.hero.badge} onChange={(e) => set('hero', { badge: e.target.value })} maxLength={80} />
      <TextInput label="Title" value={v.hero.title} onChange={(e) => set('hero', { title: e.target.value })} maxLength={120} />
      <TextArea label="Description" value={v.hero.description} onChange={(e) => set('hero', { description: e.target.value })} maxLength={300} />
    </Group>
    <Group title="About us">
      <Two>
        <TextInput label="Small tag" value={v.about.tag} onChange={(e) => set('about', { tag: e.target.value })} maxLength={40} />
        <TextInput label="Title" value={v.about.title} onChange={(e) => set('about', { title: e.target.value })} maxLength={160} />
      </Two>
      <TextArea label="Text" rows={4} value={v.about.body} onChange={(e) => set('about', { body: e.target.value })} maxLength={800} />
      <ObjectList label="Numbers" items={v.about.stats} onChange={(stats) => set('about', { stats })} max={8} addLabel="Add number"
        create={() => ({ stat: '', label: '' })} title={(x: V) => x.stat}>
        {(x: V, s: (p: Partial<V>) => void) => (
          <Two>
            <TextInput label="Number" value={x.stat} onChange={(e) => s({ stat: e.target.value })} maxLength={20} hint="Example: 1,200+" />
            <TextInput label="Label" value={x.label} onChange={(e) => s({ label: e.target.value })} maxLength={120} />
          </Two>
        )}
      </ObjectList>
    </Group>
    <Group title="Trusted-by strip">
      <TextInput label="Heading" value={v.partners.label} onChange={(e) => set('partners', { label: e.target.value })} maxLength={120} />
      <StringList label="Names" items={v.partners.names} onChange={(names) => set('partners', { names })} max={12} addLabel="Add name" />
    </Group>
    <Group title="Capabilities">
      <TextInput label="Small tag" value={v.capabilities.tag} onChange={(e) => set('capabilities', { tag: e.target.value })} maxLength={40} />
      <TextInput label="Title" value={v.capabilities.title} onChange={(e) => set('capabilities', { title: e.target.value })} maxLength={160} />
      <TextArea label="Description" value={v.capabilities.description} onChange={(e) => set('capabilities', { description: e.target.value })} maxLength={300} />
      <ObjectList label="Cards" items={v.capabilities.items} onChange={(items) => set('capabilities', { items })} max={9} addLabel="Add card"
        create={() => ({ tag: '', title: '', description: '' })} title={(x: V) => x.title}>
        {(x: V, s: (p: Partial<V>) => void) => (<>
          <Two>
            <TextInput label="Label on image" value={x.tag} onChange={(e) => s({ tag: e.target.value })} maxLength={40} />
            <TextInput label="Title" value={x.title} onChange={(e) => s({ title: e.target.value })} maxLength={80} />
          </Two>
          <TextArea label="Description" value={x.description} onChange={(e) => s({ description: e.target.value })} maxLength={300} />
        </>)}
      </ObjectList>
    </Group>
    <Group title="Workflow heading">
      <Two>
        <TextInput label="Small tag" value={v.workflow.tag} onChange={(e) => set('workflow', { tag: e.target.value })} maxLength={40} />
        <TextInput label="Title" value={v.workflow.title} onChange={(e) => set('workflow', { title: e.target.value })} maxLength={120} />
      </Two>
      <TextArea label="Description" value={v.workflow.description} onChange={(e) => set('workflow', { description: e.target.value })} maxLength={400} />
    </Group>
    <Group title="“Both sides” heading">
      <Two>
        <TextInput label="Small tag" value={v.impact.tag} onChange={(e) => set('impact', { tag: e.target.value })} maxLength={40} />
        <TextInput label="Title" value={v.impact.title} onChange={(e) => set('impact', { title: e.target.value })} maxLength={120} />
      </Two>
    </Group>
  </>);
}

export const EDITORS: Record<string, React.ComponentType<P<V>>> = {
  hero: HeroEditor,
  whySeekers: WhyEditor,
  whyRecruiters: WhyEditor,
  careerPaths: CareerPathsEditor,
  testimonials: TestimonialsEditor,
  faq: FaqEditor,
  pageSeeker: PageEditor,
  pageCompanies: PageEditor,
  pageOverview: OverviewEditor,
};

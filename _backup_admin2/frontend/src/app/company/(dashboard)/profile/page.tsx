'use client';

import { assetUrl } from '@/lib/assetUrl';
import { z } from 'zod';
import { businessName, optionalPhone, optionalPlace, optionalUrl, optionalText, stripPhone, stripPlace } from '@/lib/validation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import {
  Camera, Building2, Globe, Phone, MapPin, CheckCircle2, AlertTriangle, Eye, ShieldAlert, Image as ImageIcon, Save, Undo2,
} from 'lucide-react';
import { Panel, PanelSkeleton, cx } from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, Field, Toast, useHideFooter, inputCls, selectCls, textareaCls, btnPrimary, btnSecondary,
} from '@/components/enterprise/dashboard/kit';

const INDUSTRIES = [
  'Information Technology', 'Finance & Banking', 'Healthcare', 'Education', 'Manufacturing', 'Retail & E-commerce',
  'Telecommunications', 'Construction', 'Media & Entertainment', 'Logistics & Transportation', 'Government', 'Consulting', 'Other',
];

interface CompanyProfile {
  companyName: string; industry: string; website: string; phone: string; location: string; aboutUs: string; logoUrl: string; coverImageUrl: string;
}
const EMPTY: CompanyProfile = { companyName: '', industry: '', website: '', phone: '', location: '', aboutUs: '', logoUrl: '', coverImageUrl: '' };
const ABOUT_MAX = 1000;

function CompanyProfileContent() {
  useHideFooter();
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY);
  const [initial, setInitial] = useState<CompanyProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/me');
        const p = res.data.data.profile;
        const next: CompanyProfile = {
          companyName: p?.companyName || '', industry: p?.industry || '', website: p?.website || '', phone: p?.phone || '',
          location: p?.location || '', aboutUs: p?.aboutUs || '', logoUrl: p?.logoUrl || '', coverImageUrl: p?.coverImageUrl || '',
        };
        setProfile(next); setInitial(next);
        setLogoPreview(assetUrl(next.logoUrl)); setCoverPreview(assetUrl(next.coverImageUrl));
      } catch { flash('err', 'Failed to load the profile.'); }
      finally { setLoading(false); }
    })();
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { flash('err', 'Use a JPG, PNG or WEBP image.'); e.target.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { flash('err', 'Image must be under 5MB.'); e.target.value = ''; return; }
    const url = URL.createObjectURL(file);
    if (type === 'logo') { setLogoFile(file); setRemoveLogo(false); setLogoPreview(url); } else { setCoverFile(file); setRemoveCover(false); setCoverPreview(url); }
  }

  const dirty = useMemo(
    () => !!logoFile || !!coverFile || removeLogo || removeCover || (Object.keys(EMPTY) as Array<keyof CompanyProfile>).some(k => k !== 'logoUrl' && k !== 'coverImageUrl' && profile[k] !== initial[k]),
    [profile, initial, logoFile, coverFile, removeLogo, removeCover],
  );

  const websiteError = profile.website && !/^https?:\/\/.+\..+/i.test(profile.website) ? 'Start with http:// or https://' : '';

  const checklist = [
    { label: 'Company name', done: !!profile.companyName },
    { label: 'Industry', done: !!profile.industry },
    { label: 'Website', done: !!profile.website },
    { label: 'Phone', done: !!profile.phone },
    { label: 'Location', done: !!profile.location },
    { label: 'About us (50+ characters)', done: profile.aboutUs.trim().length >= 50 },
    { label: 'Logo', done: !!logoPreview },
    { label: 'Cover image', done: !!coverPreview },
  ];
  const score = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  async function handleSave() {
    if (websiteError) { flash('err', 'Fix the website address first.'); return; }
    const check = z.object({
      companyName: businessName('Company name'),
      industry: optionalText('Industry', 60),
      website: optionalUrl('Website'),
      phone: optionalPhone,
      location: optionalPlace('Location'),
      aboutUs: optionalText('About us', 3000),
    }).safeParse(profile);
    if (!check.success) { flash('err', check.error.issues[0]?.message || 'Please check the form.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      // Empty optional fields are sent as '' so they can be cleared.
      (['companyName', 'industry', 'website', 'phone', 'location', 'aboutUs'] as const).forEach(k => fd.append(k, profile[k].trim()));
      if (logoFile) fd.append('logo', logoFile);
      if (coverFile) fd.append('coverImage', coverFile);
      if (!logoFile && removeLogo) fd.append('removeLogo', 'true');
      if (!coverFile && removeCover) fd.append('removeCover', 'true');
      const res = await api.patch('/auth/company/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      // Show the permanent URLs the server stored, not the temporary browser previews.
      const saved = res.data?.data ?? {};
      setLogoPreview(assetUrl(saved.logoUrl)); setCoverPreview(assetUrl(saved.coverImageUrl));
      setInitial(profile); setLogoFile(null); setCoverFile(null); setRemoveLogo(false); setRemoveCover(false);
      flash('ok', 'Profile saved.');
    } catch (e: unknown) {
      flash('err', (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save the profile.');
    }
    finally { setSaving(false); }
  }

  function discard() {
    setProfile(initial); setLogoFile(null); setCoverFile(null); setRemoveLogo(false); setRemoveCover(false);
    setLogoPreview(assetUrl(initial.logoUrl)); setCoverPreview(assetUrl(initial.coverImageUrl));
  }

  if (loading) return <div className="max-w-5xl space-y-4"><PanelSkeleton rows={3} /><PanelSkeleton rows={8} /></div>;

  const set = <K extends keyof CompanyProfile>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setProfile(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5 pb-24 text-slate-800">
      <PageHead eyebrow="Account" title="Company profile" description="This is what candidates see on your job listings. A complete profile earns more applications." />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="relative h-44 bg-gradient-to-br from-[#0063CE] to-[#0084DA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {coverPreview && <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
              <label htmlFor="cover-img" className="absolute bottom-3 right-3 inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-white/90 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-white transition-colors shadow-sm">
                <Camera className="w-3.5 h-3.5" /> Change cover
                <input id="cover-img" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'cover')} />
              </label>
              {coverPreview && (
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setRemoveCover(true); }}
                  className="absolute bottom-3 right-36 inline-flex items-center h-8 px-3 rounded-lg bg-white/90 text-rose-600 text-xs font-semibold hover:bg-white transition-colors shadow-sm cursor-pointer">Remove</button>
              )}
            </div>
            <div className="px-6 pb-5 -mt-10 flex items-end gap-4">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white bg-white shadow-md">
                  {logoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[#0063CE] font-semibold text-2xl">{profile.companyName?.[0]?.toUpperCase() || 'C'}</div>}
                </div>
                <label htmlFor="logo-img" className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-[#0063CE] text-white flex items-center justify-center cursor-pointer border-2 border-white hover:bg-[#0052AB] transition-colors" title="Change logo">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <input id="logo-img" type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'logo')} />
                </label>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(''); setRemoveLogo(true); }} title="Remove logo" aria-label="Remove logo"
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-rose-200 text-rose-500 text-xs font-bold flex items-center justify-center shadow hover:bg-rose-50 cursor-pointer">×</button>
                )}
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 truncate">{profile.companyName || 'Your company'}</h2>
                <p className="text-xs text-slate-600">{[profile.industry, profile.location].filter(Boolean).join(' · ') || 'Add your industry and location'}</p>
              </div>
            </div>
          </section>

          <Panel title="Company details" subtitle="Name, industry and contact" icon={<Building2 className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company name" required>
                <input value={profile.companyName} maxLength={100} onChange={e => setProfile(p => ({ ...p, companyName: stripPlace(e.target.value) }))} placeholder="Acme Ltd" className={inputCls} />
              </Field>
              <Field label="Industry">
                <select value={profile.industry} onChange={set('industry')} className={selectCls}>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Website" error={websiteError}>
                <div className="relative"><Globe className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="url" maxLength={200} value={profile.website} onChange={set('website')} placeholder="https://company.com" className={cx(inputCls, 'pl-9', websiteError && '!border-rose-300')} /></div>
              </Field>
              <Field label="Phone">
                <div className="relative"><Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="tel" inputMode="tel" maxLength={20} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: stripPhone(e.target.value) }))} placeholder="+94 11 000 0000" className={cx(inputCls, 'pl-9')} /></div>
              </Field>
              <Field label="Location" className="sm:col-span-2">
                <div className="relative"><MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input maxLength={100} value={profile.location} onChange={e => setProfile(p => ({ ...p, location: stripPlace(e.target.value) }))} placeholder="Colombo, Sri Lanka" className={cx(inputCls, 'pl-9')} /></div>
              </Field>
            </div>
          </Panel>

          <Panel title="About your company" subtitle="Mission, culture and what makes it a good place to work" icon={<Eye className="w-3.5 h-3.5" />}>
            <textarea rows={7} maxLength={ABOUT_MAX} value={profile.aboutUs} onChange={set('aboutUs')} placeholder="Tell candidates who you are, what you build and how your team works." className={textareaCls} />
            <p className={cx('text-xs text-right mt-1.5 tabular-nums', profile.aboutUs.length > ABOUT_MAX * 0.9 ? 'text-amber-600' : 'text-slate-500')}>{profile.aboutUs.length} / {ABOUT_MAX}</p>
          </Panel>
        </div>

        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-24">
          <Panel title="Profile strength" subtitle={score === 100 ? 'Complete' : `${checklist.filter(c => !c.done).length} item${checklist.filter(c => !c.done).length === 1 ? '' : 's'} left`} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={cx('h-full rounded-full transition-all duration-500', score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${score}%` }} /></div>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{score}%</span>
            </div>
            <ul className="space-y-2">
              {checklist.map(c => (
                <li key={c.label} className="flex items-center gap-2.5 text-xs">
                  <span className={cx('w-4 h-4 rounded-full flex items-center justify-center shrink-0', c.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300')}><CheckCircle2 className="w-3 h-3" /></span>
                  <span className={c.done ? 'text-slate-600' : 'text-slate-500'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Listing preview" subtitle="How candidates see you" icon={<Eye className="w-3.5 h-3.5" />}>
            <div className="rounded-lg border border-slate-200 p-3.5 flex items-center gap-3">
              {logoPreview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoPreview} alt="" className="w-10 h-10 rounded-lg object-cover" />
                : <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0063CE] to-[#0084DA] text-white font-semibold flex items-center justify-center">{profile.companyName?.[0]?.toUpperCase() || 'C'}</span>}
              <div className="min-w-0"><p className="text-[13px] font-semibold text-slate-900 truncate">{profile.companyName || 'Company name'}</p><p className="text-xs text-slate-500 truncate">{profile.location || 'Location'} · {profile.industry || 'Industry'}</p></div>
            </div>
          </Panel>

          <Panel title="Danger zone" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">Deleting your account removes your company, jobs and applications permanently.</p>
            <Link href="/settings/delete-account" className={cx(btnSecondary, 'text-rose-600 border-rose-200 hover:!bg-rose-50 hover:!text-rose-700')}><AlertTriangle className="w-3.5 h-3.5" /> Delete account</Link>
          </Panel>
        </div>
      </div>

      {/* Sticky save bar appears only when there are unsaved changes */}
      <div className={cx('fixed bottom-0 left-0 right-0 z-40 transition-transform duration-200 pointer-events-none', dirty ? 'translate-y-0' : 'translate-y-full')}>
        <div className="lg:pl-[248px]">
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pb-4 pointer-events-auto">
            <div className="flex items-center justify-between gap-3 bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-2xl">
              <p className="text-xs font-medium">You have unsaved changes</p>
              <div className="flex items-center gap-2">
                <button onClick={discard} disabled={saving} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"><Undo2 className="w-3.5 h-3.5" /> Discard</button>
                <button onClick={handleSave} disabled={saving} className={cx(btnPrimary, '!bg-white !text-slate-900 hover:!bg-slate-100 !h-8')}><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

export default function CompanyProfilePage() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <CompanyProfileContent />
    </AuthGuard>
  );
}

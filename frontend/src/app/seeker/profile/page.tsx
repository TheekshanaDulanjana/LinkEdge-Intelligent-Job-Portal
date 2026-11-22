'use client';

import { INTERVIEW_SERVICE_URL, authHeader } from '@/lib/api';
import { assetUrl } from '@/lib/assetUrl';
import { z } from 'zod';
import { personName, optionalPhone, optionalPlace, optionalText, optionalUrl, stripName, stripPhone, stripPlace } from '@/lib/validation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api, { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import ResumeManager from '@/components/profile/ResumeManager';
import ProfileHeroSection from '@/components/profile/ProfileHeroSection';
import {
  ArrowLeft,
  Calendar,
  Globe,
  Globe2,
  Grid,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  X,
  Briefcase,
  AlertCircle,
  Video,
  Sparkles,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
  rejectionMessage?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewVenue?: string;
  job: { title: string; location: string; id: string; companyName?: string };
}

interface SeekerProfile {
  fullName: string;
  phone: string;
  location: string;
  interestArea: string;
  workStatus: 'EMPLOYED' | 'UNEMPLOYED';
  professionalSummary: string;
  profileImageUrl: string;
  websiteUrl?: string;
  githubUrl?: string;
  behanceUrl?: string;
  workStyle?: 'REMOTE' | 'HYBRID' | 'ON_SITE';
  emailJobAlerts?: boolean;
}

const INTEREST_OPTIONS = [
  'Inter UX/UI',
  'Frontend Dev',
  'UI Designer',
  'Full stack Dev',
  'Software Engineer',
  'Backend Dev',
];

type PortfolioPlatform = 'websiteUrl' | 'githubUrl' | 'behanceUrl';

function CombinedProfileContent() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<SeekerProfile>({
    fullName: '',
    phone: '',
    location: '',
    interestArea: 'Inter UX/UI',
    workStatus: 'UNEMPLOYED',
    professionalSummary: '',
    profileImageUrl: '',
    websiteUrl: '',
    githubUrl: '',
    behanceUrl: '',
    workStyle: 'REMOTE',
    emailJobAlerts: true,
  });

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  // Applications panel: collapsed by default, opened from a notification (#applications) or by click.
  const [appsOpen, setAppsOpen] = useState(false);
  const [newAppIds, setNewAppIds] = useState<string[]>([]);

  // Practice eligibility map
  const [practiceEligibility, setPracticeEligibility] = useState<Record<string, any>>({});

  // Portfolio Links Modal State
  const [activePlatform, setActivePlatform] = useState<PortfolioPlatform | null>(null);
  const [tempLinkValue, setTempLinkValue] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, appsRes] = await Promise.all([
          api.get('/auth/me'),
          applicationApi.get('/applications/my-applications').catch(() => ({ data: { data: [] } })),
        ]);

        const p = profileRes.data?.data?.profile;
        setProfile({
          fullName: p?.fullName || '',
          phone: p?.phone || '',
          location: p?.location || '',
          interestArea: p?.interestArea || '',
          workStatus: p?.workStatus || 'UNEMPLOYED',
          professionalSummary: p?.professionalSummary || '',
          profileImageUrl: p?.profileImageUrl || '',
          websiteUrl: p?.websiteUrl || '',
          githubUrl: p?.githubUrl || '',
          behanceUrl: p?.behanceUrl || '',
          workStyle: p?.workStyle || 'REMOTE',
          emailJobAlerts: p?.emailJobAlerts !== false,
        });
        if (p?.profileImageUrl) setImagePreview(assetUrl(p.profileImageUrl));

        const apps: Application[] = appsRes.data?.data || [];
        setApplications(apps);
        try {
          const raw = localStorage.getItem('seekerAppSeen');
          const seen: Record<string, string> = raw ? JSON.parse(raw) : {};
          if (raw) setNewAppIds(apps.filter((a) => seen[a.id] !== a.status).map((a) => a.id));
        } catch { /* ignore storage errors */ }

        const checks: Record<string, any> = {};
        for (const app of apps) {
          if (app.status === 'INTERVIEW') {
            try {
              const r = await fetch(`${INTERVIEW_SERVICE_URL}/interview/can-practice/${app.id}`, { headers: authHeader() });
              checks[app.id] = await r.json();
            } catch {
              checks[app.id] = { can_practice: false, reason: 'Service unavailable' };
            }
          }
        }
        setPracticeEligibility(checks);
      } catch {
        setError('Failed to load profile details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Open + scroll to the applications panel when arriving from a notification.
  useEffect(() => {
    if (loading) return;
    if (window.location.hash === '#applications') {
      setAppsOpen(true);
      setTimeout(() => document.getElementById('applications')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [loading]);

  // Opening the panel marks every current status as seen (dots stay for this visit only).
  useEffect(() => {
    if (!appsOpen || applications.length === 0) return;
    try {
      const seen: Record<string, string> = {};
      applications.forEach((a) => { seen[a.id] = a.status; });
      localStorage.setItem('seekerAppSeen', JSON.stringify(seen));
    } catch { /* ignore */ }
  }, [appsOpen, applications]);

  const basicSchema = z.object({
  fullName: personName('Full name'),
  phone: optionalPhone,
  location: optionalPlace('Location'),
  professionalSummary: optionalText('Summary', 2000),
});
const linkSchema = optionalUrl('Link');
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Use a JPG, PNG or WEBP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      e.target.value = '';
      return;
    }
    setError('');
    const blobUrl = URL.createObjectURL(file);
    const previous = imagePreview;
    setImagePreview(blobUrl);
    e.target.value = '';
    // Save immediately so the photo survives a refresh (no need to open "Edit Profile").
    void uploadPhoto(file, previous, blobUrl);
  }

  async function uploadPhoto(file: File, previous: string, blobUrl: string) {
    try {
      const fd = new FormData();
      fd.append('profileImage', file);
      const res = await api.patch('/auth/seeker/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImagePreview(assetUrl(res.data?.data?.profileImageUrl));
      setProfile((p) => ({ ...p, profileImageUrl: res.data?.data?.profileImageUrl || '' }));
      setImageFile(null);
      setRemoveImage(false);
      setSuccess('Profile photo updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setImagePreview(previous);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not upload the photo. Please try again.');
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async function removePhoto() {
    try {
      const fd = new FormData();
      fd.append('removeProfileImage', 'true');
      await api.patch('/auth/seeker/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImagePreview('');
      setImageFile(null);
      setRemoveImage(false);
      setProfile((p) => ({ ...p, profileImageUrl: '' }));
    } catch {
      setError('Could not remove the photo. Please try again.');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const check = basicSchema.safeParse({
        fullName: profile.fullName, phone: profile.phone ?? '', location: profile.location ?? '',
        professionalSummary: profile.professionalSummary ?? '',
      });
      if (!check.success) {
        setError(check.error.issues[0]?.message || 'Please check your details.');
        setSaving(false);
        return;
      }
      const formData = new FormData();
      // Empty optional fields are sent as '' so they can be cleared.
      (['fullName', 'phone', 'location', 'professionalSummary', 'interestArea', 'workStatus', 'workStyle'] as const).forEach((k) => {
        const v: unknown = profile[k];
        if (typeof v === 'string' && (v !== '' || k !== 'fullName')) formData.append(k, v.trim());
      });
      if (imageFile) formData.append('profileImage', imageFile);
      else if (removeImage) formData.append('removeProfileImage', 'true');

      const res = await api.patch('/auth/seeker/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Show what the server actually stored (a permanent URL), not the temporary browser preview.
      setImagePreview(assetUrl(res.data?.data?.profileImageUrl));
      setImageFile(null);
      setRemoveImage(false);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  // The e-mail alert switch saves on its own: the seeker should not need "Save Preferences" for it.
  async function toggleEmailAlerts(next: boolean) {
    setProfile((prev) => ({ ...prev, emailJobAlerts: next }));
    setError('');
    try {
      const formData = new FormData();
      formData.append('emailJobAlerts', String(next));
      await api.patch('/auth/seeker/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(next ? 'Job match e-mails are on.' : 'Job match e-mails are off.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setProfile((prev) => ({ ...prev, emailJobAlerts: !next }));   // put the switch back
      setError('Could not change the e-mail setting. Please try again.');
      setTimeout(() => setError(''), 4000);
    }
  }

  const openLinkModal = (platform: PortfolioPlatform) => {
    setActivePlatform(platform);
    setTempLinkValue(profile[platform] || '');
  };

  const handleSaveLink = async () => {
    if (!activePlatform) return;
    const trimmed = tempLinkValue.trim();
    const linkCheck = linkSchema.safeParse(trimmed);
    if (!linkCheck.success) {
      setError(linkCheck.error.issues[0]?.message || 'Enter a valid link.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setProfile((prev) => ({ ...prev, [activePlatform]: trimmed }));
    setActivePlatform(null);
    setTempLinkValue('');

    try {
      const formData = new FormData();
      formData.append(activePlatform, trimmed);
      await api.patch('/auth/seeker/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Portfolio link saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save the link. Please try again.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const getPlatformLabel = (platform: PortfolioPlatform) => {
    switch (platform) {
      case 'websiteUrl': return 'Personal Website';
      case 'githubUrl': return 'GitHub';
      case 'behanceUrl': return 'Behance';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#0F9DE4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const STATUS_META: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    PENDING:     { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     label: 'Pending' },
    REVIEWING:   { dot: 'bg-[#0F9DE4]',   text: 'text-[#0025B8]',   bg: 'bg-sky-50 border-sky-200',         label: 'Reviewing' },
    SHORTLISTED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Shortlisted' },
    INTERVIEW:   { dot: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',   label: 'Interview' },
    REJECTED:    { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',    label: 'Not selected' },
  };
  const STAGES = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW'] as const;
  const STAGE_LABELS: Record<string, string> = { PENDING: 'Applied', REVIEWING: 'Reviewing', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview' };

  const LINKS: { key: PortfolioPlatform; label: string; Icon: typeof Globe }[] = [
    { key: 'websiteUrl', label: 'Personal Website', Icon: Globe },
    { key: 'githubUrl', label: 'GitHub', Icon: Globe2 },
    { key: 'behanceUrl', label: 'Behance', Icon: Grid },
  ];

  const cardCls = 'bg-white rounded-3xl border border-sky-100 shadow-sm';

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <ProfileHeroSection />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        {/* The whole Candidate Profile section: modals inside it blur only this card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-7xl mx-auto bg-white border border-sky-100 rounded-[32px] p-5 sm:p-8 lg:p-10 shadow-2xl space-y-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-sky-100">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Candidate Profile</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Your details, applications and resume in one place</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold bg-white hover:bg-sky-50 px-4 py-2 rounded-full border border-sky-200 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-[#0F9DE4]" />
              <span className="text-[#0025B8]">Back to Home</span>
            </Link>
          </div>

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 shadow-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{success}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 shadow-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ───────── LEFT: profile details first ───────── */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-sky-50/70 via-blue-50/30 to-white rounded-3xl border border-sky-100 p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="relative shrink-0">
                    <div className="w-28 h-28 rounded-3xl overflow-hidden bg-sky-100 border-4 border-white shadow-md">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#0025B8] text-4xl font-bold bg-sky-50">
                          {profile.fullName?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <label
                      htmlFor="profile-img"
                      className="absolute -bottom-1 -right-1 w-9 h-9 bg-white border border-sky-200 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-sky-50 transition-colors"
                      title="Change photo"
                    >
                      <Pencil className="w-4 h-4 text-[#0F9DE4]" />
                      <input id="profile-img" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    {imagePreview && (
                      <button type="button" onClick={removePhoto}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-white border border-rose-200 rounded-full text-rose-500 text-xs font-bold flex items-center justify-center shadow hover:bg-rose-50 cursor-pointer"
                        title="Remove photo" aria-label="Remove photo">×</button>
                    )}
                  </div>

                  <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-4 break-words max-w-full">{profile.fullName || 'User Name'}</h1>
                  <p className="text-xs font-medium text-slate-500 mt-1 break-words max-w-full">
                    {profile.professionalSummary || 'Add a short title'}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{profile.location || 'Add your location'}</p>

                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-4">
                    <Button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      variant="gradient"
                      className="px-6 py-2 text-white text-xs font-semibold rounded-full shadow-md tracking-wider uppercase cursor-pointer"
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                    </Button>
                  </motion.div>
                </div>

                <div className="mt-6 space-y-2 text-xs bg-white/80 p-4 rounded-2xl border border-sky-100">
                  <p className="text-slate-600 flex justify-between gap-3">
                    <span className="font-bold text-slate-900">Mobile</span>
                    <span className="truncate">{profile.phone || '+94 71 123 4567'}</span>
                  </p>
                  <p className="text-slate-600 flex justify-between gap-3">
                    <span className="font-bold text-slate-900">Email</span>
                    <span className="truncate">{user?.email || 'john@gmail.com'}</span>
                  </p>
                </div>
              </div>

              {/* Edit Form */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-slate-50 rounded-3xl border border-sky-100 p-6 space-y-5 shadow-inner"
                >
                  <h3 className="text-sm font-bold text-slate-900 border-b border-sky-100 pb-3 tracking-tight">Edit Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Full Name</Label>
                      <Input value={profile.fullName} maxLength={80} onChange={(e) => setProfile({ ...profile, fullName: stripName(e.target.value) })} className="mt-1.5 bg-white rounded-xl border-sky-100 h-11 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Phone</Label>
                      <Input type="tel" inputMode="tel" maxLength={20} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: stripPhone(e.target.value) })} className="mt-1.5 bg-white rounded-xl border-sky-100 h-11 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Location</Label>
                      <Input maxLength={100} value={profile.location} onChange={(e) => setProfile({ ...profile, location: stripPlace(e.target.value) })} className="mt-1.5 bg-white rounded-xl border-sky-100 h-11 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Title / Short Summary</Label>
                      <Input maxLength={2000} value={profile.professionalSummary} onChange={(e) => setProfile({ ...profile, professionalSummary: e.target.value })} className="mt-1.5 bg-white rounded-xl border-sky-100 h-11 text-xs" />
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saving} variant="gradient" className="w-full rounded-full h-11 text-xs font-bold text-white shadow-md cursor-pointer">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </motion.div>
              )}

              {/* Portfolio links */}
              <div className={`${cardCls} p-6 space-y-3`}>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Portfolio Links</h3>
                {LINKS.map(({ key, label, Icon }) => {
                  const has = !!profile[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openLinkModal(key)}
                      className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer group ${
                        has ? 'border-[#0F9DE4] bg-sky-50/60' : 'border-sky-100 bg-white hover:border-[#0F9DE4]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${has ? 'text-[#0025B8]' : 'text-slate-400 group-hover:text-[#0F9DE4]'}`} />
                      <span className="text-xs font-bold text-slate-800 flex-1">{label}</span>
                      {has ? (
                        <span className="text-[10px] font-bold text-[#0025B8] flex items-center gap-1">Added <ExternalLink className="w-2.5 h-2.5" /></span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-[#0F9DE4] flex items-center gap-0.5"><Plus className="w-2.5 h-2.5" /> Add</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Career Preferences */}
              <div className={`${cardCls} p-6 space-y-5`}>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Career Preferences</h3>

                <div>
                  <Label className="text-xs font-bold text-slate-700 block mb-2">Target Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((role) => {
                      const isSelected = profile.interestArea === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setProfile({ ...profile, interestArea: role })}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer font-semibold ${
                            isSelected
                              ? 'border-[#0F9DE4] text-white bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] shadow-sm'
                              : 'border-sky-100 text-slate-600 hover:border-sky-200 bg-white'
                          }`}
                        >
                          {role} {isSelected ? '×' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 block mb-2">Work Style</Label>
                  <select
                    value={profile.workStyle || 'REMOTE'}
                    onChange={(e) => setProfile({ ...profile, workStyle: e.target.value as SeekerProfile['workStyle'] })}
                    className="w-full bg-white border border-sky-100 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F9DE4] shadow-sm cursor-pointer"
                  >
                    <option value="REMOTE">Remote Only</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ON_SITE">On-site</option>
                  </select>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  variant="gradient"
                  className="w-full text-sm font-medium rounded-full h-11 tracking-wider shadow-md cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>

              {/* Account & Privacy */}
              <div className={`${cardCls} p-6 space-y-4`}>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Account & Privacy</h3>

                <div className="flex items-center justify-between gap-3 border-b border-sky-100 pb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Email Alerts</p>
                    <p className="text-[11px] text-slate-400 font-medium">E-mail me when a new job matches my CV (70%+)</p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Email alerts for matching jobs"
                    checked={profile.emailJobAlerts !== false}
                    onChange={(e) => toggleEmailAlerts(e.target.checked)}
                    className="h-4 w-7 accent-[#0F9DE4] cursor-pointer"
                  />
                </div>

                <Link href="/settings/delete-account">
                  <button className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center justify-between w-full cursor-pointer">
                    <span>Delete Account</span>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </aside>

            {/* ───────── RIGHT: applications + resume ───────── */}
            <div className="lg:col-span-8 space-y-8">
              {/* Applications */}
              <section id="applications" className="space-y-5 scroll-mt-24">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAppsOpen((o) => !o)}
                    aria-expanded={appsOpen}
                    className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left bg-sky-50/50 hover:bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3 cursor-pointer transition-colors"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
                        <Briefcase className="w-5 h-5 text-[#0F9DE4]" />
                        My Applications
                        <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 rounded-full bg-sky-100 text-[#0025B8] text-xs font-extrabold">
                          {applications.length}
                        </span>
                        {newAppIds.length > 0 && (
                          <span className="relative flex h-2.5 w-2.5" title="New update">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {newAppIds.length > 0 ? `${newAppIds.length} new update${newAppIds.length > 1 ? 's' : ''} — tap to view` : 'Tap to view every application and its stage'}
                      </p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[#0F9DE4] shrink-0 transition-transform ${appsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <Link href="/jobs">
                    <Button size="sm" variant="outline" className="text-xs font-semibold text-[#0025B8] border-sky-200 hover:bg-sky-50 rounded-full h-9 px-4 border-2">
                      Browse More Jobs
                    </Button>
                  </Link>
                </div>

                {!appsOpen ? null : applications.length === 0 ? (
                  <div className="bg-white rounded-3xl border-2 border-dashed border-sky-200 p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                      <Briefcase className="w-6 h-6 text-[#0F9DE4]" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No applications yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-6 font-medium">Once you apply for a role, it will show up here.</p>
                    <Link href="/jobs">
                      <Button size="sm" variant="gradient" className="text-xs rounded-full px-6 h-11 font-bold shadow-md">
                        Find Opportunities
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                    {applications.map((app) => {
                      const eligibility = practiceEligibility[app.id];
                      const meta = STATUS_META[app.status] ?? STATUS_META.PENDING;
                      const stageIdx = STAGES.indexOf(app.status as (typeof STAGES)[number]);

                      return (
                        <div
                          key={app.id}
                          className="bg-white rounded-2xl border border-sky-100 hover:shadow-lg transition-shadow overflow-hidden shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4 p-5 pb-4">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 border border-sky-100">
                                <Briefcase className="w-5 h-5 text-[#0F9DE4]" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-base tracking-tight truncate">{app.job?.title || 'Position Title'}</p>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                  {app.job?.companyName ? `${app.job.companyName} · ` : ''}{app.job?.location || 'Location'}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                  Applied {new Date(app.createdAt).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {newAppIds.includes(app.id) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500" />New update</span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border whitespace-nowrap ${meta.bg} ${meta.text}`}>
                              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                            </div>
                          </div>

                          {/* Progress stepper */}
                          {app.status !== 'REJECTED' && stageIdx >= 0 && (
                            <div className="px-5 pb-4">
                              <div className="flex items-center">
                                {STAGES.map((s, i) => (
                                  <div key={s} className="flex items-center flex-1 last:flex-none">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`w-3 h-3 rounded-full border-2 ${
                                        i <= stageIdx ? 'bg-[#0F9DE4] border-[#0F9DE4]' : 'bg-white border-slate-200'
                                      }`} />
                                      <span className={`text-[10px] font-semibold whitespace-nowrap ${i <= stageIdx ? 'text-[#0025B8]' : 'text-slate-400'}`}>
                                        {STAGE_LABELS[s]}
                                      </span>
                                    </div>
                                    {i < STAGES.length - 1 && (
                                      <span className={`h-0.5 flex-1 mx-1 mb-4 rounded ${i < stageIdx ? 'bg-[#0F9DE4]' : 'bg-slate-200'}`} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {app.status === 'INTERVIEW' && app.interviewDate && (
                            <div className="mx-5 mb-4 bg-sky-50/60 border border-sky-100 rounded-2xl p-4">
                              <div className="flex items-center gap-2 text-[#0025B8] font-bold text-xs mb-2">
                                <Calendar className="w-4 h-4 text-[#0F9DE4]" />
                                Interview scheduled
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 font-medium">
                                <p>
                                  <span className="text-slate-400">Date & time </span>
                                  <span className="font-bold text-slate-800">
                                    {new Date(app.interviewDate).toLocaleDateString('en-GB', {
                                      weekday: 'short', day: '2-digit', month: 'short',
                                    })} · {app.interviewTime}
                                  </span>
                                </p>
                                {app.interviewVenue && (
                                  <p>
                                    <span className="text-slate-400">Venue </span>
                                    <span className="font-bold text-slate-800">{app.interviewVenue}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {app.status === 'REJECTED' && (app.rejectionReason || app.rejectionMessage) && (
                            <div className="mx-5 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                                <AlertCircle className="w-4 h-4 text-slate-400" />
                                Feedback on this application
                              </div>
                              {app.rejectionReason && (
                                <p className="text-xs font-bold text-slate-800 mb-1">{app.rejectionReason}</p>
                              )}
                              {app.rejectionMessage && (
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">{app.rejectionMessage}</p>
                              )}
                            </div>
                          )}

                          {app.status === 'INTERVIEW' && (
                            <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-t border-sky-100 bg-sky-50/20">
                              {eligibility?.can_practice ? (
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                  <Link href={`/seeker/interview/${app.id}`} className="w-full sm:w-auto">
                                    <Button size="sm" variant="gradient" className="w-full sm:w-auto text-xs font-bold rounded-full px-6 h-10 shadow-md flex items-center gap-2 cursor-pointer">
                                      <Video className="w-4 h-4" />
                                      Practice interview
                                    </Button>
                                  </Link>
                                  {eligibility.expires_at && (
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      Available until {new Date(eligibility.expires_at).toLocaleString('en-GB', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button size="sm" disabled className="opacity-40 cursor-not-allowed text-xs rounded-full px-6">
                                    Practice interview
                                  </Button>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {eligibility?.reason || 'Practice window unavailable'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Resume */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Resume</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Upload, preview or replace your CV</p>
                </div>
                <ResumeManager />
              </section>
            </div>
          </div>

          {/* Link modal: covers only this section */}
          <AnimatePresence>
            {activePlatform && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 border border-sky-100"
                >
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-sky-100">
                    <h3 className="font-bold text-slate-900 text-base tracking-tight">
                      Add {getPlatformLabel(activePlatform)} Link
                    </h3>
                    <button
                      onClick={() => setActivePlatform(null)}
                      className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-sky-50 transition-all cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 mb-2 block">
                        {getPlatformLabel(activePlatform)} URL
                      </Label>
                      <Input
                        type="url"
                        maxLength={200}
                        placeholder={`https://${activePlatform === 'githubUrl' ? 'github.com/username' : activePlatform === 'behanceUrl' ? 'behance.net/username' : 'yourwebsite.com'}`}
                        value={tempLinkValue}
                        onChange={(e) => setTempLinkValue(e.target.value)}
                        className="h-12 text-xs bg-slate-50 border-sky-100 rounded-2xl focus-visible:ring-[#0F9DE4] px-4 shadow-sm"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActivePlatform(null)}
                        className="flex-1 text-xs h-11 rounded-full border-sky-200 text-slate-700 hover:bg-sky-50 font-semibold cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveLink}
                        variant="gradient"
                        className="flex-1 text-xs h-11 rounded-full text-white font-bold shadow-md cursor-pointer"
                      >
                        Save Link
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

export default function SeekerProfilePage() {
  return (
    <AuthGuard requiredRole="SEEKER">
      <CombinedProfileContent />
    </AuthGuard>
  );
}

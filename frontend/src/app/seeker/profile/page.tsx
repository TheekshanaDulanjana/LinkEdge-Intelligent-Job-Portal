'use client';

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
  Lock,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  X,
  Briefcase,
  AlertCircle,
  Video,
  Sparkles,
  CheckCircle2
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
        });
        if (p?.profileImageUrl) setImagePreview(assetUrl(p.profileImageUrl));

        const apps: Application[] = appsRes.data?.data || [];
        setApplications(apps);

        const checks: Record<string, any> = {};
        for (const app of apps) {
          if (app.status === 'INTERVIEW') {
            try {
              const r = await fetch(`http://localhost:8002/api/v1/interview/can-practice/${app.id}`);
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

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <ProfileHeroSection />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto bg-white/90 backdrop-blur-xl border border-sky-100 rounded-[32px] p-6 sm:p-8 md:p-12 shadow-2xl space-y-10"
        >
          
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-sky-100">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Candidate Profile</h2>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/25 backdrop-blur-md px-4 py-2 rounded-full border border-sky-200 transition-all shadow-sm"
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

          {/* Profile Card */}
          <div className="bg-gradient-to-br from-sky-50/60 via-blue-50/30 to-white rounded-3xl border border-sky-100 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-sky-100 border-2 border-white shadow-md">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0025B8] text-3xl font-bold bg-sky-50">
                      {profile.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <label
                  htmlFor="profile-img"
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-sky-200 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-sky-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#0F9DE4]" />
                  <input id="profile-img" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {imagePreview && (
                  <button type="button" onClick={removePhoto}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-white border border-rose-200 rounded-full text-rose-500 text-xs font-bold flex items-center justify-center shadow hover:bg-rose-50 cursor-pointer"
                    title="Remove photo" aria-label="Remove photo">×</button>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{profile.fullName || 'User Name'}</h1>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  {profile.professionalSummary || 'Add a short title'} • {profile.location || 'Add your location'}
                </p>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block mt-3">
                  <Button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    variant="gradient"
                    className="px-5 py-2 text-white text-xs font-semibold rounded-full shadow-md tracking-wider uppercase cursor-pointer"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                  </Button>
                </motion.div>
              </div>
            </div>

            <div className="text-right space-y-1.5 self-start md:self-center w-full md:w-auto text-xs bg-white/80 p-4 rounded-2xl border border-sky-100 shadow-xs">
              <p className="text-slate-600">
                <span className="font-bold text-slate-900">Mobile: </span>
                {profile.phone || '+94 71 123 4567'}
              </p>
              <p className="text-slate-600">
                <span className="font-bold text-slate-900">Email: </span>
                {user?.email || 'john@gmail.com'}
              </p>
            </div>
          </div>

          {/* Edit Form Drawer */}
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-50 rounded-3xl border border-sky-100 p-6 sm:p-8 space-y-6 shadow-inner"
            >
              <h3 className="text-sm font-bold text-slate-900 border-b border-sky-100 pb-3 tracking-tight">Edit Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              <Button onClick={handleSave} disabled={saving} variant="gradient" className="rounded-full px-6 h-11 text-xs font-bold text-white shadow-md cursor-pointer">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          )}

          {/* Applications Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
                  <Briefcase className="w-5 h-5 text-[#0F9DE4]" />
                  My Applications
                  <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 rounded-full bg-sky-100 text-[#0025B8] text-xs font-extrabold shadow-xs">
                    {applications.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Track every application and its current stage</p>
              </div>
              <Link href="/jobs">
                <Button size="sm" variant="outline" className="text-xs font-semibold text-[#0025B8] border-sky-200 hover:bg-sky-50 rounded-full h-10 px-5 shadow-xs border-2">
                  Browse More Jobs
                </Button>
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-sky-200 p-12 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4 border border-sky-100 shadow-sm">
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
              <div className="space-y-4">
                {applications.map((app) => {
                  const eligibility = practiceEligibility[app.id];

                  const STATUS_META: Record<string, { dot: string; text: string; bg: string; label: string }> = {
                    PENDING:     { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   label: 'Pending' },
                    REVIEWING:   { dot: 'bg-[#0F9DE4]',   text: 'text-[#0025B8]',   bg: 'bg-sky-50 border-sky-200',        label: 'Reviewing' },
                    SHORTLISTED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Shortlisted' },
                    INTERVIEW:   { dot: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200', label: 'Interview' },
                    REJECTED:    { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',  label: 'Not selected' },
                  };
                  const meta = STATUS_META[app.status] ?? STATUS_META.PENDING;

                  return (
                    <motion.div
                      key={app.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white/90 backdrop-blur-xl rounded-2xl border border-sky-100 hover:shadow-xl transition-all overflow-hidden shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 p-6 pb-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-sky-100 shadow-sm">
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

                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border whitespace-nowrap flex-shrink-0 shadow-xs ${meta.bg} ${meta.text}`}>
                          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>

                      {app.status === 'INTERVIEW' && app.interviewDate && (
                        <div className="mx-6 mb-4 bg-sky-50/60 border border-sky-100 rounded-2xl p-4 shadow-xs">
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
                        <div className="mx-6 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
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
                        <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-t border-sky-100 bg-sky-50/20">
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
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grid for Resume, Links, and Preferences */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
            
            {/* Resume & Portfolio */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-sky-50/30 rounded-[28px] border border-sky-100 p-6 sm:p-8 space-y-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Resume & Portfolio</h3>

              <ResumeManager />

              {/* Links Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div
                  onClick={() => openLinkModal('websiteUrl')}
                  className={`border rounded-2xl p-4 text-center transition-all cursor-pointer group relative shadow-xs ${
                    profile.websiteUrl
                      ? 'border-[#0F9DE4] bg-sky-50/60 ring-1 ring-[#0F9DE4]'
                      : 'border-sky-100 bg-white hover:border-[#0F9DE4]'
                  }`}
                >
                  <div className={`flex justify-center mb-2 ${profile.websiteUrl ? 'text-[#0025B8]' : 'text-slate-400 group-hover:text-[#0F9DE4]'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Personal Website</p>
                  {profile.websiteUrl ? (
                    <p className="text-[10px] text-[#0025B8] font-bold truncate mt-1 flex items-center justify-center gap-1">
                      <span>Added</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 group-hover:text-[#0F9DE4] mt-1 font-bold flex items-center justify-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add Link
                    </p>
                  )}
                </div>

                <div
                  onClick={() => openLinkModal('githubUrl')}
                  className={`border rounded-2xl p-4 text-center transition-all cursor-pointer group relative shadow-xs ${
                    profile.githubUrl
                      ? 'border-[#0F9DE4] bg-sky-50/60 ring-1 ring-[#0F9DE4]'
                      : 'border-sky-100 bg-white hover:border-[#0F9DE4]'
                  }`}
                >
                  <div className={`flex justify-center mb-2 ${profile.githubUrl ? 'text-[#0025B8]' : 'text-slate-400 group-hover:text-[#0F9DE4]'}`}>
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">GitHub</p>
                  {profile.githubUrl ? (
                    <p className="text-[10px] text-[#0025B8] font-bold truncate mt-1 flex items-center justify-center gap-1">
                      <span>Added</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 group-hover:text-[#0F9DE4] mt-1 font-bold flex items-center justify-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add Link
                    </p>
                  )}
                </div>

                <div
                  onClick={() => openLinkModal('behanceUrl')}
                  className={`border rounded-2xl p-4 text-center transition-all cursor-pointer group relative shadow-xs ${
                    profile.behanceUrl
                      ? 'border-[#0F9DE4] bg-sky-50/60 ring-1 ring-[#0F9DE4]'
                      : 'border-sky-100 bg-white hover:border-[#0F9DE4]'
                  }`}
                >
                  <div className={`flex justify-center mb-2 ${profile.behanceUrl ? 'text-[#0025B8]' : 'text-slate-400 group-hover:text-[#0F9DE4]'}`}>
                    <Grid className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Behance</p>
                  {profile.behanceUrl ? (
                    <p className="text-[10px] text-[#0025B8] font-bold truncate mt-1 flex items-center justify-center gap-1">
                      <span>Added</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 group-hover:text-[#0F9DE4] mt-1 font-bold flex items-center justify-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add Link
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Preferences */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 rounded-[28px] border border-sky-100 p-6 sm:p-8 space-y-6 shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Career Preferences</h3>

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

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    variant="gradient"
                    className="w-full text-sm font-medium rounded-full py-3 h-12  tracking-wider shadow-md cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </motion.div>
              </div>

              {/* Privacy */}
              <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 rounded-[28px] border border-sky-100 p-6 sm:p-8 space-y-5 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Account & Privacy</h3>

                <div className="flex items-center justify-between border-b border-sky-100 pb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Email Alerts</p>
                    <p className="text-[11px] text-slate-400 font-medium">Job Matches & Updates</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-7 accent-[#0F9DE4] cursor-pointer" />
                </div>

                <div className="flex items-center justify-between border-b border-sky-100 pb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Data Visibility</p>
                    <p className="text-[11px] text-slate-400 font-medium">Recruiter Search Results</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-7 accent-[#0F9DE4] cursor-pointer" />
                </div>

                <div className="flex items-center justify-between border-b border-sky-100 pb-4 cursor-pointer group">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#0F9DE4] transition-colors">
                    Security Settings
                  </p>
                  <Lock className="w-4 h-4 text-slate-400 group-hover:text-[#0F9DE4]" />
                </div>

                <div className="pt-2">
                  <Link href="/settings/delete-account">
                    <button className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center justify-between w-full cursor-pointer">
                      <span>Delete Account</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {activePlatform && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 border border-sky-100"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-sky-100">
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  Add {getPlatformLabel(activePlatform)} Link
                </h3>
                <button
                  onClick={() => setActivePlatform(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-sky-50 transition-all cursor-pointer"
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
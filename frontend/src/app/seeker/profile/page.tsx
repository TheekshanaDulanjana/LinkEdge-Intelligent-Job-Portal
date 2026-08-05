'use client';

import { useEffect, useState } from 'react';
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
}

const INTEREST_OPTIONS = [
  'Inter UX/UI',
  'Frontend Dev',
  'UI Designer',
  'Full stack Dev',
  'Software Engineer',
  'Backend Dev',
];

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  REVIEWING: 'bg-blue-100 text-blue-700 border-blue-200',
  SHORTLISTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INTERVIEW: 'bg-purple-100 text-purple-700 border-purple-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
};

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
  });

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
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
          fullName: p?.fullName || 'John Smith',
          phone: p?.phone || '+94 71 123 4567',
          location: p?.location || 'Colombo, Sri Lanka',
          interestArea: p?.interestArea || 'Inter UX/UI',
          workStatus: p?.workStatus || 'UNEMPLOYED',
          professionalSummary: p?.professionalSummary || 'Intern UX/UI Engineer',
          profileImageUrl: p?.profileImageUrl || '',
          websiteUrl: p?.websiteUrl || '',
          githubUrl: p?.githubUrl || '',
          behanceUrl: p?.behanceUrl || '',
        });
        if (p?.profileImageUrl) setImagePreview(p.profileImageUrl);

        const apps: Application[] = appsRes.data?.data || [];
        setApplications(apps);

        // Fetch interview practice eligibility for INTERVIEW status apps
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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([k, v]) => {
        if (v) formData.append(k, v as string);
      });
      if (imageFile) formData.append('profileImage', imageFile);

      await api.patch('/auth/seeker/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  const openLinkModal = (platform: PortfolioPlatform) => {
    setActivePlatform(platform);
    setTempLinkValue(profile[platform] || '');
  };

  const handleSaveLink = () => {
    if (!activePlatform) return;
    setProfile((prev) => ({
      ...prev,
      [activePlatform]: tempLinkValue.trim(),
    }));
    setActivePlatform(null);
    setTempLinkValue('');
    setSuccess('Portfolio link updated. Click "Save Preferences" to commit changes.');
    setTimeout(() => setSuccess(''), 4000);
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#0084FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <ProfileHeroSection />

      <main className="flex-1 py-10 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Candidate Profile</h2>
            <Link
              href="/"
              className="text-xs font-semibold text-[#0084FF] hover:underline flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-xs font-medium text-green-700">
              {success}
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-gray-200/60 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-200 border border-gray-300">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#0084FF] text-3xl font-bold bg-blue-50">
                      {profile.fullName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <label
                  htmlFor="profile-img"
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-600" />
                  <input id="profile-img" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.fullName || 'User Name'}</h1>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  {profile.professionalSummary || 'Intern UX/UI Engineer'} • {profile.location || 'Location'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="mt-3 px-4 py-1.5 bg-[#0084FF] hover:bg-[#0073E6] text-white text-[11px] font-semibold rounded-lg tracking-wider transition-colors uppercase"
                >
                  {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>
            </div>

            <div className="text-right space-y-1.5 self-start md:self-center w-full md:w-auto text-xs">
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">Mobile: </span>
                {profile.phone || '+94 71 123 4567'}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">Email: </span>
                {user?.email || 'john@gmail.com'}
              </p>
            </div>
          </div>

          {/* Edit Form Drawer */}
          {isEditing && (
            <div className="bg-[#F8FAFC] rounded-2xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Edit Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="mt-1 bg-white" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1 bg-white" />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className="mt-1 bg-white" />
                </div>
                <div>
                  <Label className="text-xs">Title / Short Summary</Label>
                  <Input value={profile.professionalSummary} onChange={(e) => setProfile({ ...profile, professionalSummary: e.target.value })} className="mt-1 bg-white" />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-[#0084FF] hover:bg-[#0073E6] text-white text-xs font-semibold">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* Applications Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0084FF]" />
                  My Applications
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-blue-50 text-[#0084FF] text-[11px] font-bold">
                    {applications.length}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Track every application and its current stage</p>
              </div>
              <Link href="/jobs">
                <Button size="sm" variant="outline" className="text-xs text-[#0084FF] border-[#0084FF] hover:bg-blue-50">
                  Browse More Jobs
                </Button>
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-5 h-5 text-[#0084FF]" />
                </div>
                <p className="text-sm font-semibold text-gray-800">No applications yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Once you apply for a role, it'll show up here.</p>
                <Link href="/jobs">
                  <Button size="sm" className="bg-[#0084FF] hover:bg-[#0073E6] text-white text-xs">
                    Find Opportunities
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const eligibility = practiceEligibility[app.id];

                  const STATUS_META: Record<string, { dot: string; text: string; bg: string; label: string }> = {
                    PENDING:     { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100',   label: 'Pending' },
                    REVIEWING:   { dot: 'bg-[#0084FF]',   text: 'text-[#0084FF]',   bg: 'bg-blue-50 border-blue-100',     label: 'Reviewing' },
                    SHORTLISTED: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: 'Shortlisted' },
                    INTERVIEW:   { dot: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50 border-violet-100', label: 'Interview' },
                    REJECTED:    { dot: 'bg-gray-400',    text: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',     label: 'Not selected' },
                  };
                  const meta = STATUS_META[app.status] ?? STATUS_META.PENDING;

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-2xl border border-gray-200/80 hover:border-[#0084FF]/30 hover:shadow-sm transition-all overflow-hidden"
                    >
                      {/* Top row: role + status */}
                      <div className="flex items-start justify-between gap-4 p-5 pb-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Briefcase className="w-4 h-4 text-[#0084FF]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{app.job?.title || 'Position Title'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {app.job?.companyName ? `${app.job.companyName} · ` : ''}{app.job?.location || 'Location'}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Applied {new Date(app.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap flex-shrink-0 ${meta.bg} ${meta.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>

                      {/* Interview details */}
                      {app.status === 'INTERVIEW' && app.interviewDate && (
                        <div className="mx-5 mb-4 bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-[#0084FF] font-semibold text-xs mb-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Interview scheduled
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                            <p>
                              <span className="text-gray-400">Date & time </span>
                              <span className="font-medium text-gray-800">
                                {new Date(app.interviewDate).toLocaleDateString('en-GB', {
                                  weekday: 'short', day: '2-digit', month: 'short',
                                })} · {app.interviewTime}
                              </span>
                            </p>
                            {app.interviewVenue && (
                              <p>
                                <span className="text-gray-400">Venue </span>
                                <span className="font-medium text-gray-800">{app.interviewVenue}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rejection feedback */}
                      {app.status === 'REJECTED' && (app.rejectionReason || app.rejectionMessage) && (
                        <div className="mx-5 mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                            Feedback on this application
                          </div>
                          {app.rejectionReason && (
                            <p className="text-xs font-semibold text-gray-800 mb-1">{app.rejectionReason}</p>
                          )}
                          {app.rejectionMessage && (
                            <p className="text-xs text-gray-500 leading-relaxed">{app.rejectionMessage}</p>
                          )}
                        </div>
                      )}

                      {/* Practice interview CTA */}
                      {app.status === 'INTERVIEW' && (
                        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                          {eligibility?.can_practice ? (
                            <div className="flex items-center gap-3">
                              <Link href={`/seeker/interview/${app.id}`}>
                                <Button size="sm" className="bg-[#0084FF] hover:bg-[#0073E6] text-white text-xs font-semibold flex items-center gap-1.5">
                                  <Video className="w-3.5 h-3.5" />
                                  Practice interview
                                </Button>
                              </Link>
                              {eligibility.expires_at && (
                                <span className="text-[11px] text-gray-400">
                                  Available until {new Date(eligibility.expires_at).toLocaleString('en-GB', {
                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button size="sm" disabled className="opacity-40 cursor-not-allowed text-xs">
                                Practice interview
                              </Button>
                              <span className="text-[11px] text-gray-400">
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
          </div>

          {/* Grid for Resume, Links, and Preferences */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* Resume & Portfolio */}
            <div className="lg:col-span-2 bg-[#F8FAFC] rounded-2xl border border-gray-200/60 p-6 space-y-5">
              <h3 className="text-base font-bold text-gray-900">Resume & Portfolio</h3>

              <ResumeManager />

              {/* Links Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div
                  onClick={() => openLinkModal('websiteUrl')}
                  className={`border rounded-xl p-3.5 text-center transition-all cursor-pointer group relative ${
                    profile.websiteUrl
                      ? 'border-[#0084FF]/40 bg-blue-50/40 hover:border-[#0084FF]'
                      : 'border-gray-200 bg-white hover:border-[#0084FF]'
                  }`}
                >
                  <div className={`flex justify-center mb-1.5 ${profile.websiteUrl ? 'text-[#0084FF]' : 'text-gray-400 group-hover:text-[#0084FF]'}`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">Personal Website</p>
                  {profile.websiteUrl ? (
                    <p className="text-[10px] text-[#0084FF] font-medium truncate mt-1 flex items-center justify-center gap-1">
                      <span>Added</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 group-hover:text-[#0084FF] mt-1 flex items-center justify-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add Link
                    </p>
                  )}
                </div>

                <div
                  onClick={() => openLinkModal('githubUrl')}
                  className={`border rounded-xl p-3.5 text-center transition-all cursor-pointer group relative ${
                    profile.githubUrl
                      ? 'border-[#0084FF]/40 bg-blue-50/40 hover:border-[#0084FF]'
                      : 'border-gray-200 bg-white hover:border-[#0084FF]'
                  }`}
                >
                  <div className={`flex justify-center mb-1.5 ${profile.githubUrl ? 'text-[#0084FF]' : 'text-gray-400 group-hover:text-[#0084FF]'}`}>
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">GitHub</p>
                  {profile.githubUrl ? (
                    <p className="text-[10px] text-[#0084FF] font-medium truncate mt-1 flex items-center justify-center gap-1">
                      <span>Added</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 group-hover:text-[#0084FF] mt-1 flex items-center justify-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add Link
                    </p>
                  )}
                </div>

                <div
                  onClick={() => openLinkModal('behanceUrl')}
                  className={`border rounded-xl p-3.5 text-center transition-all cursor-pointer group relative ${
                    profile.behanceUrl
                      ? 'border-[#0084FF]/40 bg-blue-50/40 hover:border-[#0084FF]'
                      : 'border-gray-200 bg-white hover:border-[#0084FF]'
                  }`}
                >
                  <div className={`flex justify-center mb-1.5 ${profile.behanceUrl ? 'text-[#0084FF]' : 'text-gray-400 group-hover:text-[#0084FF]'}`}>
                    <Grid className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">Behance</p>
                  {profile.behanceUrl ? (
                    <p className="text-[10px] text-[#0084FF] font-medium truncate mt-1 flex items-center justify-center gap-1">
                      <span>Added</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 group-hover:text-[#0084FF] mt-1 flex items-center justify-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Add Link
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Preferences */}
            <div className="space-y-6">
              <div className="bg-[#F8FAFC] rounded-2xl border border-gray-200/60 p-6 space-y-4">
                <h3 className="text-base font-bold text-gray-900">Career Preferences</h3>

                <div>
                  <Label className="text-xs text-gray-500 font-medium">Engagement Mode</Label>
                  <div className="flex bg-[#EBF4FF] rounded-xl p-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, workStatus: 'UNEMPLOYED' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        profile.workStatus === 'UNEMPLOYED'
                          ? 'bg-[#0084FF] text-white shadow-sm'
                          : 'text-[#0084FF]'
                      }`}
                    >
                      ACTIVELY
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, workStatus: 'EMPLOYED' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        profile.workStatus === 'EMPLOYED'
                          ? 'bg-[#0084FF] text-white shadow-sm'
                          : 'text-[#0084FF]'
                      }`}
                    >
                      CASUALLY
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 font-medium">Target Roles</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {INTEREST_OPTIONS.map((role) => {
                      const isSelected = profile.interestArea === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setProfile({ ...profile, interestArea: role })}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                            isSelected
                              ? 'border-[#0084FF] text-[#0084FF] bg-blue-50 font-semibold'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                          }`}
                        >
                          {role} {isSelected ? '×' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 font-medium">Work Style</Label>
                  <select className="w-full mt-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0084FF]">
                    <option>Remote Only</option>
                    <option>Hybrid</option>
                    <option>On-site</option>
                  </select>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-[#0084FF] hover:bg-[#0073E6] text-white text-xs font-bold rounded-xl py-2 uppercase tracking-wider"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>

              {/* Privacy */}
              <div className="bg-[#F8FAFC] rounded-2xl border border-gray-200/60 p-6 space-y-4">
                <h3 className="text-base font-bold text-gray-900">Account & Privacy</h3>

                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Email Alerts</p>
                    <p className="text-[10px] text-gray-400">Job Matches & Updates</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-7 accent-[#0084FF] cursor-pointer" />
                </div>

                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Data Visibility</p>
                    <p className="text-[10px] text-gray-400">Recruiter Search Results</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-7 accent-[#0084FF] cursor-pointer" />
                </div>

                <div className="flex items-center justify-between border-b border-gray-200 pb-3 cursor-pointer group">
                  <p className="text-xs font-semibold text-gray-900 group-hover:text-[#0084FF] transition-colors">
                    Security Settings
                  </p>
                  <Lock className="w-4 h-4 text-gray-400 group-hover:text-[#0084FF]" />
                </div>

                <div className="pt-1">
                  <Link href="/settings/delete-account">
                    <button className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center justify-between w-full">
                      <span>Delete Account</span>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Modal */}
      {activePlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Add {getPlatformLabel(activePlatform)} Link
              </h3>
              <button
                onClick={() => setActivePlatform(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  {getPlatformLabel(activePlatform)} URL
                </Label>
                <Input
                  type="url"
                  placeholder={`https://${activePlatform === 'githubUrl' ? 'github.com/username' : activePlatform === 'behanceUrl' ? 'behance.net/username' : 'yourwebsite.com'}`}
                  value={tempLinkValue}
                  onChange={(e) => setTempLinkValue(e.target.value)}
                  className="h-10 text-xs bg-slate-50 border-slate-200 focus-visible:ring-[#0084FF]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActivePlatform(null)}
                  className="flex-1 text-xs h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveLink}
                  className="flex-1 text-xs h-9 bg-[#0084FF] hover:bg-[#0073E6] text-white font-semibold"
                >
                  Save Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
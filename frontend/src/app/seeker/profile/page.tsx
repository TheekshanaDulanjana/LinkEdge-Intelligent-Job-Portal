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
  CheckCircle2,
} from 'lucide-react';

interface Application {
  id: string;
  status: string;
  createdAt: string;
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

        const p = profileRes.data.data.profile;
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

        const apps: Application[] = appsRes.data.data || [];
        setApplications(apps);
      } catch (err) {
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

  // Open Portfolio Modal
  const openLinkModal = (platform: PortfolioPlatform) => {
    setActivePlatform(platform);
    setTempLinkValue(profile[platform] || '');
  };

  // Save Portfolio Link
  const handleSaveLink = () => {
    if (!activePlatform) return;
    setProfile((prev) => ({
      ...prev,
      [activePlatform]: tempLinkValue.trim(),
    }));
    setActivePlatform(null);
    setTempLinkValue('');
    setSuccess('Portfolio link updated. Click "Save Preferences" or "Save Profile" to keep changes.');
    setTimeout(() => setSuccess(''), 4000);
  };

  const getPlatformLabel = (platform: PortfolioPlatform) => {
    switch (platform) {
      case 'websiteUrl': return 'Personal Website';
      case 'githubUrl': return 'GitHub';
      case 'behanceUrl': return 'Behance';
    }
  };

  const interviewApps = applications.filter((app) => app.status === 'INTERVIEW');

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
        <div className="max-w-7xl mx-auto bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm space-y-6">
          
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

          {/* Profile Card Header */}
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

          {/* Inline Edit Drawer */}
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

          {/* Interview Banner Section */}
          {interviewApps.length > 0 ? (
            interviewApps.map((app) => (
              <div key={app.id} className="bg-[#F0F7FF] rounded-2xl border border-[#D0E5FF] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#0084FF]/10 text-[#0084FF] flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Interview Invitation Received</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {app.job.companyName || 'Glamer Media'} has invited you for a {app.job.title} role.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                  <Link href={`/seeker/interview/${app.id}`} className="w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-[#0084FF] hover:bg-[#0073E6] text-white text-xs font-semibold px-4 py-2 rounded-xl uppercase">
                      View Details & Schedule
                    </Button>
                  </Link>
                  <Button variant="outline" className="border-[#0084FF] text-[#0084FF] hover:bg-blue-50 text-xs font-semibold px-4 py-2 rounded-xl uppercase">
                    Decline
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#F8FAFC] rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-200/60 text-gray-500 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">No Active Interview Invitations</p>
                  <p className="text-xs text-gray-500">You currently have no pending interview sessions scheduled.</p>
                </div>
              </div>
              <Link href="/jobs" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#0084FF] hover:bg-[#0073E6] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                  Browse Available Jobs
                </Button>
              </Link>
            </div>
          )}

          {/* Lower Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* Resume & Portfolio Section */}
            <div className="lg:col-span-2 bg-[#F8FAFC] rounded-2xl border border-gray-200/60 p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900">Resume & Portfolio</h3>
              </div>

              <ResumeManager />

              {/* Portfolio Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                
                {/* Personal Website */}
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
                      <Plus className="w-2.5 h-2.5" />
                      Click to add link
                    </p>
                  )}
                </div>

                {/* Github */}
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
                      <Plus className="w-2.5 h-2.5" />
                      Click to add link
                    </p>
                  )}
                </div>

                {/* Behance */}
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
                      <Plus className="w-2.5 h-2.5" />
                      Click to add link
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

      {/* Portfolio Link Input Modal */}
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
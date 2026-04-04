'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

const INTEREST_AREAS = [
  'Software Engineering', 'Data Science & AI', 'Cybersecurity',
  'Cloud Computing', 'UI/UX Design', 'DevOps & Infrastructure',
  'Mobile Development', 'Business Analysis', 'Project Management',
  'Marketing & Sales', 'Finance & Accounting', 'Human Resources',
  'Healthcare', 'Education', 'Legal', 'Other',
];

interface SeekerProfile {
  fullName: string;
  phone: string;
  location: string;
  interestArea: string;
  workStatus: 'EMPLOYED' | 'UNEMPLOYED';
  professionalSummary: string;
  profileImageUrl: string;
}

function SeekerProfileContent() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<SeekerProfile>({
    fullName: '',
    phone: '',
    location: '',
    interestArea: '',
    workStatus: 'UNEMPLOYED',
    professionalSummary: '',
    profileImageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/auth/me');
        const p = res.data.data.profile;
        setProfile({
          fullName: p?.fullName || '',
          phone: p?.phone || '',
          location: p?.location || '',
          interestArea: p?.interestArea || '',
          workStatus: p?.workStatus || 'UNEMPLOYED',
          professionalSummary: p?.professionalSummary || '',
          profileImageUrl: p?.profileImageUrl || '',
        });
        if (p?.profileImageUrl) setImagePreview(p.profileImageUrl);
      } catch { setError('Failed to load profile'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
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
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to save profile'); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/seeker/dashboard" className="text-sm text-purple-600 hover:underline">
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">My Profile</h1>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border p-8 space-y-6">
          {/* Profile image */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-100 border-2 border-purple-200">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-600 text-2xl font-bold">
                    {profile.fullName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <label
                htmlFor="profile-img"
                className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
                <input
                  id="profile-img"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.email}</p>
              <p className="text-sm text-gray-400">Job Seeker Account</p>
              <p className="text-xs text-gray-400 mt-1">Click the pencil icon to change photo</p>
            </div>
          </div>

          <div className="border-t pt-6 grid grid-cols-2 gap-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="John Perera"
              />
            </div>
            <div>
              <Label>Mobile number</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+94 77 000 0000"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                placeholder="Colombo, Sri Lanka"
              />
            </div>
            <div>
              <Label>Interest area</Label>
              <select
                value={profile.interestArea}
                onChange={(e) => setProfile({ ...profile, interestArea: e.target.value })}
                className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select area...</option>
                {INTEREST_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Work status toggle */}
          <div>
            <Label>Current work status</Label>
            <div className="flex gap-3 mt-2">
              {(['EMPLOYED', 'UNEMPLOYED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProfile({ ...profile, workStatus: s })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    profile.workStatus === s
                      ? s === 'EMPLOYED'
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'bg-orange-50 border-orange-400 text-orange-700'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {s === 'EMPLOYED' ? 'Employed' : 'Seeking work'}
                </button>
              ))}
            </div>
          </div>

          {/* Professional summary */}
          <div>
            <Label>Professional summary</Label>
            <textarea
              rows={4}
              value={profile.professionalSummary}
              onChange={(e) => setProfile({ ...profile, professionalSummary: e.target.value })}
              placeholder="Briefly describe your professional background, key skills, and career goals..."
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {profile.professionalSummary.length} / 500 characters
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SeekerProfilePage() {
  return (
    <AuthGuard requiredRole="SEEKER">
      <SeekerProfileContent />
    </AuthGuard>
  );
}
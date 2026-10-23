'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

const INDUSTRIES = [
  'Information Technology', 'Finance & Banking', 'Healthcare',
  'Education', 'Manufacturing', 'Retail & E-commerce',
  'Telecommunications', 'Construction', 'Media & Entertainment',
  'Logistics & Transportation', 'Government', 'Consulting', 'Other',
];

interface CompanyProfile {
  companyName: string;
  industry: string;
  website: string;
  phone: string;
  location: string;
  aboutUs: string;
  logoUrl: string;
  coverImageUrl: string;
}

function CompanyProfileContent() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<CompanyProfile>({
    companyName: '', industry: '', website: '',
    phone: '', location: '', aboutUs: '',
    logoUrl: '', coverImageUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/auth/me');
        const p = res.data.data.profile;
        setProfile({
          companyName: p?.companyName || '',
          industry: p?.industry || '',
          website: p?.website || '',
          phone: p?.phone || '',
          location: p?.location || '',
          aboutUs: p?.aboutUs || '',
          logoUrl: p?.logoUrl || '',
          coverImageUrl: p?.coverImageUrl || '',
        });
        if (p?.logoUrl) setLogoPreview(p.logoUrl);
        if (p?.coverImageUrl) setCoverPreview(p.coverImageUrl);
      } catch { setError('Failed to load profile'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'cover'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError('Image must be under 3MB'); return; }
    const preview = URL.createObjectURL(file);
    if (type === 'logo') { setLogoFile(file); setLogoPreview(preview); }
    else { setCoverFile(file); setCoverPreview(preview); }
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (logoFile) formData.append('logo', logoFile);
      if (coverFile) formData.append('coverImage', coverFile);
      await api.patch('/auth/company/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to save profile'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Cover image section */}
      <div className="relative h-48 bg-gradient-to-r from-purple-600 to-blue-500 overflow-hidden">
        {coverPreview && (
          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover opacity-80"/>
        )}
        <label
          htmlFor="cover-img"
          className="absolute bottom-3 right-4 flex items-center gap-2 bg-black bg-opacity-50 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-opacity-70 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Change cover
          <input id="cover-img" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover')}/>
        </label>
      </div>

      <div className="max-w-2xl mx-auto px-6">
        {/* Logo */}
        <div className="relative -mt-12 mb-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-white bg-white shadow-md">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-2xl">
                {profile.companyName?.[0]?.toUpperCase() || 'C'}
              </div>
            )}
          </div>
          <label
            htmlFor="logo-img"
            className="absolute -bottom-2 left-16 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            <input id="logo-img" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')}/>
          </label>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Link href="/company/dashboard" className="text-sm text-purple-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-semibold">Company Profile</h1>
        </div>

        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">{success}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>}

        <div className="bg-white rounded-xl border p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company name</Label>
              <Input value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} placeholder="TechCorp Ltd"/>
            </div>
            <div>
              <Label>Industry</Label>
              <select
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://company.com"/>
            </div>
            <div>
              <Label>Phone / Contact</Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+94 11 000 0000"/>
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <Input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="Colombo, Sri Lanka"/>
            </div>
          </div>

          {/* About us section */}
          <div>
            <Label>About us</Label>
            <textarea
              rows={5}
              value={profile.aboutUs}
              onChange={(e) => setProfile({ ...profile, aboutUs: e.target.value })}
              placeholder="Describe your company, mission, culture, and what makes you a great place to work..."
              className="w-full mt-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{profile.aboutUs.length} / 1000</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save profile'}
          </Button>

          {/* Delete account section */}
          <div className="pt-4 border-t mt-2">
            <Link href="/settings/delete-account">
              <button className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors">
                Delete my account permanently
              </button>
            </Link>
          </div>
        </div>
      </div>
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
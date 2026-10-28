'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import { Camera, Edit2, ArrowLeft, Building2, Globe, Phone, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

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

  // Footer eka hide kirima me page ekedi
  useEffect(() => {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
      footerElement.style.display = 'none';
    }
    return () => {
      if (footerElement) {
        footerElement.style.display = '';
      }
    };
  }, []);

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
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#0025B8] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 font-sans text-slate-800">
      
      {/* Cover image header section */}
      <div className="relative h-60 sm:h-72 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] overflow-hidden shadow-md">
        {coverPreview && (
          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover opacity-90"/>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        
        <label
          htmlFor="cover-img"
          className="absolute bottom-4 right-6 flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer hover:bg-white/30 transition-all border border-white/30 shadow-md"
        >
          <Camera className="w-4 h-4" />
          Change cover image
          <input id="cover-img" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover')}/>
        </label>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Logo Avatar Overlay & Navigation */}
        <div className="relative -mt-16 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end gap-5">
            <div className="relative">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white bg-white shadow-xl">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center text-[#0025B8] font-black text-3xl">
                    {profile.companyName?.[0]?.toUpperCase() || 'C'}
                  </div>
                )}
              </div>
              <label
                htmlFor="logo-img"
                className="absolute -bottom-2 -right-2 w-9 h-9 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] rounded-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-md text-white border-2 border-white"
              >
                <Edit2 className="w-4 h-4" />
                <input id="logo-img" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'logo')}/>
              </label>
            </div>
            
            <div className="pb-2">
              <Link href="/company/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] transition-colors mb-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {profile.companyName || 'Company Profile'}
              </h1>
            </div>
          </div>
        </div>

        {/* Success / Error Banners */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-semibold text-emerald-800 flex items-center gap-3 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {success}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm font-semibold text-rose-800 flex items-center gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 sm:p-10 shadow-xl space-y-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Company name</Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={profile.companyName} 
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} 
                  placeholder="TechCorp Ltd"
                  className="pl-10 h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Industry</Label>
              <select
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="w-full h-12 border border-sky-100 rounded-2xl px-4 text-xs font-medium bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer text-slate-800 shadow-xs"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={profile.website} 
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })} 
                  placeholder="https://company.com"
                  className="pl-10 h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Phone / Contact</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={profile.phone} 
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })} 
                  placeholder="+94 11 000 0000"
                  className="pl-10 h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label className="text-xs font-bold text-slate-700">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={profile.location} 
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })} 
                  placeholder="Colombo, Sri Lanka"
                  className="pl-10 h-12 text-xs font-medium rounded-2xl border-sky-100 bg-slate-50/50"
                />
              </div>
            </div>

          </div>

          {/* About us section */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700">About us</Label>
            <textarea
              rows={5}
              value={profile.aboutUs}
              onChange={(e) => setProfile({ ...profile, aboutUs: e.target.value })}
              placeholder="Describe your company, mission, culture, and what makes you a great place to work..."
              className="w-full mt-1 border border-sky-100 bg-slate-50/50 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 resize-none shadow-xs text-slate-800"
            />
            <p className="text-[11px] text-slate-400 font-medium text-right">{profile.aboutUs.length} / 1000 characters</p>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button onClick={handleSave} disabled={saving} variant="gradient" className="w-full rounded-full h-12 text-xs font-bold shadow-md cursor-pointer">
              {saving ? 'Saving changes...' : 'Save profile'}
            </Button>
          </motion.div>

          {/* Delete account section */}
          <div className="pt-6 border-t border-sky-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Danger Zone</span>
            <Link href="/settings/delete-account">
              <button className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors cursor-pointer">
                Delete my account permanently
              </button>
            </Link>
          </div>
        </motion.div>

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
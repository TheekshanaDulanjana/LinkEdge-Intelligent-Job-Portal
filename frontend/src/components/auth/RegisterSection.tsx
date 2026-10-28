'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import { motion } from 'framer-motion';
import { personName, businessName, emailRule, newPassword, optionalPhone, optionalPlace, optionalText, optionalUrl, filter, stripName, stripPlace, stripPhone } from '@/lib/validation';

const seekerSchema = z.object({
  fullName: personName('Full name'),
  email: emailRule,
  phone: optionalPhone,
  location: optionalPlace('Location'),
  password: newPassword,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

const companySchema = z.object({
  companyName: businessName('Company name'),
  email: emailRule,
  phone: optionalPhone,
  location: optionalPlace('Location'),
  industry: optionalText('Industry', 60),
  website: optionalUrl('Website'),
  password: newPassword,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

type SeekerForm = z.infer<typeof seekerSchema>;
type CompanyForm = z.infer<typeof companySchema>;

/** Drop empty optional fields so the server does not receive blank strings. */
function clean<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)) as T;
}

export default function RegisterFormSection() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role')?.toUpperCase() === 'COMPANY' ? 'COMPANY' : 'SEEKER';

  const [role, setRole] = useState<'SEEKER' | 'COMPANY'>(initialRole);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Sync role state if URL query params change dynamically
  useEffect(() => {
    const roleParam = searchParams.get('role')?.toUpperCase();
    if (roleParam === 'COMPANY' || roleParam === 'SEEKER') {
      setRole(roleParam);
    }
  }, [searchParams]);

  const seekerForm = useForm<SeekerForm>({ resolver: zodResolver(seekerSchema) });
  const companyForm = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });

  async function onSeekerSubmit(data: SeekerForm) {
    setLoading(true); setServerError('');
    try {
      await api.post('/auth/register/seeker', clean(data));
      setRegisteredEmail(data.email);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  async function onCompanySubmit(data: CompanyForm) {
    setLoading(true); setServerError('');
    try {
      await api.post('/auth/register/company', clean(data));
      setRegisteredEmail(data.email);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  if (registeredEmail) {
    return (
      <div className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[24px] items-center w-full max-w-lg mx-auto bg-white p-8 shadow-xl mt-10">
        <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#0F9DE4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Check your email</h2>
            <p className="text-black/60 text-sm mb-6">
              We sent a verification code to <strong>{registeredEmail}</strong>.
            </p>
            <Link href={`/verify-email?email=${encodeURIComponent(registeredEmail)}`}>
              <Button variant="gradient" className="w-full h-12 cursor-pointer">Enter verification code</Button>
            </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[24px] items-center w-full lg:w-1/2 bg-white p-6 sm:p-8 shadow-xl"
    >
      <div className="w-full max-w-sm space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black">Create An Account</h2>
          <p className="text-black/60 mt-1 text-sm">Join the Intelligent Job Portal</p>
        </div>

        {/* Role Toggle & Direct URL Links */}
        <div className="flex p-1 bg-[#0F9DE4]/10 shadow-sm rounded-full w-full">
          <Link href="/register?role=seeker" className="flex-1 flex">
            <button 
              type="button"
              onClick={() => setRole('SEEKER')}
              className={`w-full py-2 text-xs cursor-pointer font-medium rounded-full transition-all ${role === 'SEEKER' ? 'bg-gradient-to-r from-[#0F9DE4] to-[#0025B8] text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
            >
              Job Seeker
            </button>
          </Link>
          <Link href="/register?role=company" className="flex-1 flex">
            <button 
              type="button"
              onClick={() => setRole('COMPANY')}
              className={`w-full py-2 cursor-pointer text-xs font-medium rounded-full transition-all ${role === 'COMPANY' ? 'bg-gradient-to-r from-[#0F9DE4] to-[#0025B8] text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
            >
              Company
            </button>
          </Link>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {serverError}
          </div>
        )}

        {role === 'SEEKER' && (
          <form onSubmit={seekerForm.handleSubmit(onSeekerSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input placeholder="John Doe" maxLength={80} autoComplete="name" {...seekerForm.register('fullName', filter(stripName))} className="h-10" />
                {seekerForm.formState.errors.fullName && <p className="text-xs text-red-500">{seekerForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input type="tel" inputMode="tel" placeholder="+94 71 123 4567" maxLength={20} autoComplete="tel" {...seekerForm.register('phone', filter(stripPhone))} className="h-10" />
                {seekerForm.formState.errors.phone && <p className="text-xs text-red-500">{seekerForm.formState.errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" maxLength={254} autoComplete="email" placeholder="johndoe@example.com" {...seekerForm.register('email')} className="h-10" />
              {seekerForm.formState.errors.email && <p className="text-xs text-red-500">{seekerForm.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="Colombo, Sri Lanka" maxLength={100} {...seekerForm.register('location', filter(stripPlace))} className="h-10" />
              {seekerForm.formState.errors.location && <p className="text-xs text-red-500">{seekerForm.formState.errors.location.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" maxLength={72} autoComplete="new-password" placeholder="Create password" {...seekerForm.register('password')} className="h-10" />
                {seekerForm.formState.errors.password && <p className="text-xs text-red-500">{seekerForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" maxLength={72} autoComplete="new-password" placeholder="Confirm password" {...seekerForm.register('confirmPassword')} className="h-10" />
                {seekerForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{seekerForm.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>

            <Button type="submit" variant="gradient" className="w-full h-12 mt-4 cursor-pointer" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        )}

        {role === 'COMPANY' && (
          <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input placeholder="Abc (Pvt) Ltd." maxLength={100} {...companyForm.register('companyName', filter(stripPlace))} className="h-10" />
                {companyForm.formState.errors.companyName && <p className="text-xs text-red-500">{companyForm.formState.errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input placeholder="e.g. Software, Design" maxLength={60} {...companyForm.register('industry', filter(stripPlace))} className="h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" maxLength={254} autoComplete="email" placeholder="hr@company.com" {...companyForm.register('email')} className="h-10" />
              {companyForm.formState.errors.email && <p className="text-xs text-red-500">{companyForm.formState.errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" inputMode="tel" placeholder="+94 71 123 4567" maxLength={20} {...companyForm.register('phone', filter(stripPhone))} className="h-10" />
                {companyForm.formState.errors.phone && <p className="text-xs text-red-500">{companyForm.formState.errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Colombo, Sri Lanka" maxLength={100} {...companyForm.register('location', filter(stripPlace))} className="h-10" />
                {companyForm.formState.errors.location && <p className="text-xs text-red-500">{companyForm.formState.errors.location.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input type="url" maxLength={200} placeholder="https://company.com" {...companyForm.register('website')} className="h-10" />
              {companyForm.formState.errors.website && <p className="text-xs text-red-500">{companyForm.formState.errors.website.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" maxLength={72} autoComplete="new-password" placeholder="Create password" {...companyForm.register('password')} className="h-10" />
                {companyForm.formState.errors.password && <p className="text-xs text-red-500">{companyForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" maxLength={72} autoComplete="new-password" placeholder="Confirm password" {...companyForm.register('confirmPassword')} className="h-10" />
                {companyForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{companyForm.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>

            <Button type="submit" variant="gradient" className="w-full h-12 mt-4 cursor-pointer" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        )}

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-black/20" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-black/50">or continue with Google</span>
          </div>
        </div>

        <GoogleAuthButton role={role} />

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0052CC] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
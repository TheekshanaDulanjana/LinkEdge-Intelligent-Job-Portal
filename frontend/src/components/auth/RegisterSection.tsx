'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import GoogleAuthButton from '@/components/GoogleAuthButton';

const seekerSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7).optional(),
  location: z.string().optional(),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

const companySchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7).optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

type SeekerForm = z.infer<typeof seekerSchema>;
type CompanyForm = z.infer<typeof companySchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'SEEKER' | 'COMPANY'>('SEEKER');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const seekerForm = useForm<SeekerForm>({ resolver: zodResolver(seekerSchema) });
  const companyForm = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });

  async function onSeekerSubmit(data: SeekerForm) {
    setLoading(true); setServerError('');
    try {
      await api.post('/auth/register/seeker', data);
      setRegisteredEmail(data.email);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  async function onCompanySubmit(data: CompanyForm) {
    setLoading(true); setServerError('');
    try {
      await api.post('/auth/register/company', data);
      setRegisteredEmail(data.email);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  }

  if (registeredEmail) {
    return (
      <div className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[24px] items-center w-full max-w-lg mx-auto bg-white p-8 mt-10">
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
              <Button variant="gradient" className="w-full h-12">Enter verification code</Button>
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[24px] items-center w-full lg:w-1/2 bg-white p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black">Create An Account</h2>
          <p className="text-black/60 mt-1 text-sm">Join the Intelligent Job Portal</p>
        </div>

        {/* Role Toggle */}
        <div className="flex p-1 bg-[#0F9DE4]/5 shadow-sm rounded-full w-full">
            <button 
                type="button"
                onClick={() => setRole('SEEKER')}
                className={`flex-1 py-2 text-xs cursor-pointer font-medium rounded-full transition-all ${role === 'SEEKER' ? 'bg-gradient-to-r from-[#0F9DE4] to-[#0025B8] cursor-pointer text-white' : 'text-gray-400'}`}
            >
                Job Seeker
            </button>
            <button 
                type="button"
                onClick={() => setRole('COMPANY')}
                className={`flex-1 py-2 cursor-pointer text-xs font-medium rounded-full transition-all ${role === 'COMPANY' ? 'bg-gradient-to-r from-[#0F9DE4] to-[#0025B8] text-white' : 'text-gray-400'}`}
            >
                Company
            </button>
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
                <Input placeholder="John Doe" {...seekerForm.register('fullName')} className="h-10" />
                {seekerForm.formState.errors.fullName && <p className="text-xs text-red-500">{seekerForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input placeholder="+94 71 123 4567" {...seekerForm.register('phone')} className="h-10" />
              </div>
            </div>
              
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="johndoe@example.com" {...seekerForm.register('email')} className="h-10" />
              {seekerForm.formState.errors.email && <p className="text-xs text-red-500">{seekerForm.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="Colombo, Sri Lanka" {...seekerForm.register('location')} className="h-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="Create a password" {...seekerForm.register('password')} className="h-10" />
                {seekerForm.formState.errors.password && <p className="text-xs text-red-500">{seekerForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="Confirm your password" {...seekerForm.register('confirmPassword')} className="h-10" />
                {seekerForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{seekerForm.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>

            <Button type="submit" variant="gradient" className="w-full h-12 mt-4" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        )}

        {role === 'COMPANY' && (
          <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input placeholder="Abc (Pvt) Ltd." {...companyForm.register('companyName')} className="h-10" />
                {companyForm.formState.errors.companyName && <p className="text-xs text-red-500">{companyForm.formState.errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input placeholder="e.g. Software, Design" {...companyForm.register('industry')} className="h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="hr@company.com" {...companyForm.register('email')} className="h-10" />
              {companyForm.formState.errors.email && <p className="text-xs text-red-500">{companyForm.formState.errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+94 71 123 4567" {...companyForm.register('phone')} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Colombo, Sri Lanka" {...companyForm.register('location')} className="h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="https://company.com" {...companyForm.register('website')} className="h-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="Create a password" {...companyForm.register('password')} className="h-10" />
                {companyForm.formState.errors.password && <p className="text-xs text-red-500">{companyForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="Confirm your password" {...companyForm.register('confirmPassword')} className="h-10" />
                {companyForm.formState.errors.confirmPassword && <p className="text-xs text-red-500">{companyForm.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>

            <Button type="submit" variant="gradient" className="w-full h-12 mt-4" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        )}

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-black/50" />
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
    </div>
  );
}
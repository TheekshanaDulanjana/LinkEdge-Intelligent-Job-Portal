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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import GoogleAuthButton from '@/components/GoogleAuthButton';

const seekerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional(),
  location: z.string().optional(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

const companySchema = z.object({
  companyName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  password: z.string().min(8),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm mb-6">
              We sent a 6-digit verification code to <strong>{registeredEmail}</strong>.
              Enter it on the next page to activate your account.
            </p>
            <Link href={`/verify-email?email=${encodeURIComponent(registeredEmail)}`}>
              <Button className="w-full">Enter verification code</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join the Intelligent Job Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            {(['SEEKER', 'COMPANY'] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`py-2 rounded-md text-sm font-medium transition-colors ${role === r ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                {r === 'SEEKER' ? 'Job Seeker' : 'Company'}
              </button>
            ))}
          </div>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{serverError}</div>
          )}

          {role === 'SEEKER' && (
            <form onSubmit={seekerForm.handleSubmit(onSeekerSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full name *</Label>
                  <Input placeholder="John Perera" {...seekerForm.register('fullName')}/>
                  {seekerForm.formState.errors.fullName && <p className="text-xs text-red-500 mt-1">{seekerForm.formState.errors.fullName.message}</p>}
                </div>
                <div>
                  <Label>Mobile number</Label>
                  <Input placeholder="+94 77 000 0000" {...seekerForm.register('phone')}/>
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" placeholder="john@example.com" {...seekerForm.register('email')}/>
                {seekerForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{seekerForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label>Location</Label>
                <Input placeholder="Colombo, Sri Lanka" {...seekerForm.register('location')}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Password *</Label>
                  <Input type="password" placeholder="Min 8 characters" {...seekerForm.register('password')}/>
                  {seekerForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{seekerForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <Label>Confirm password *</Label>
                  <Input type="password" placeholder="Repeat password" {...seekerForm.register('confirmPassword')}/>
                  {seekerForm.formState.errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{seekerForm.formState.errors.confirmPassword.message}</p>}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          {role === 'COMPANY' && (
            <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company name *</Label>
                  <Input placeholder="TechCorp Ltd" {...companyForm.register('companyName')}/>
                  {companyForm.formState.errors.companyName && <p className="text-xs text-red-500 mt-1">{companyForm.formState.errors.companyName.message}</p>}
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input placeholder="Information Technology" {...companyForm.register('industry')}/>
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" placeholder="hr@company.com" {...companyForm.register('email')}/>
                {companyForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{companyForm.formState.errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input placeholder="+94 11 000 0000" {...companyForm.register('phone')}/>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input placeholder="Colombo" {...companyForm.register('location')}/>
                </div>
              </div>
              <div>
                <Label>Website</Label>
                <Input placeholder="https://company.com" {...companyForm.register('website')}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Password *</Label>
                  <Input type="password" placeholder="Min 8 characters" {...companyForm.register('password')}/>
                  {companyForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{companyForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <Label>Confirm password *</Label>
                  <Input type="password" placeholder="Repeat password" {...companyForm.register('confirmPassword')}/>
                  {companyForm.formState.errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{companyForm.formState.errors.confirmPassword.message}</p>}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          {/* Google Auth Section - Now inside CardContent */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">
                or register with Google
              </span>
            </div>
          </div>
          
          <GoogleAuthButton
            role={role}
            label="Register with Google"
          />

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
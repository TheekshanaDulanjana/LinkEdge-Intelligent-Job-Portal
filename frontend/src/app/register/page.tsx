'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Seeker form schema
const seekerSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  location: z.string().optional(),
});

// Company form schema
const companySchema = z.object({
  companyName: z.string().min(2, 'Company name required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  industry: z.string().optional(),
});

type SeekerForm = z.infer<typeof seekerSchema>;
type CompanyForm = z.infer<typeof companySchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [role, setRole] = useState<'SEEKER' | 'COMPANY'>('SEEKER');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const seekerForm = useForm<SeekerForm>({ resolver: zodResolver(seekerSchema) });
  const companyForm = useForm<CompanyForm>({ resolver: zodResolver(companySchema) });

  async function onSeekerSubmit(data: SeekerForm) {
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/register/seeker', data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      router.push('/seeker/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function onCompanySubmit(data: CompanyForm) {
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/register/company', data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      router.push('/company/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join the intelligent job portal</CardDescription>
        </CardHeader>
        <CardContent>

          {/* Role selector tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setRole('SEEKER')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                role === 'SEEKER'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Job Seeker
            </button>
            <button
              onClick={() => setRole('COMPANY')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                role === 'COMPANY'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Company
            </button>
          </div>

          {/* Error message */}
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {serverError}
            </div>
          )}

          {/* Job Seeker form */}
          {role === 'SEEKER' && (
            <form onSubmit={seekerForm.handleSubmit(onSeekerSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="John Perera" {...seekerForm.register('fullName')} />
                {seekerForm.formState.errors.fullName && (
                  <p className="text-sm text-red-500 mt-1">{seekerForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" {...seekerForm.register('email')} />
                {seekerForm.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">{seekerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min. 8 characters" {...seekerForm.register('password')} />
                {seekerForm.formState.errors.password && (
                  <p className="text-sm text-red-500 mt-1">{seekerForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input id="location" placeholder="Colombo" {...seekerForm.register('location')} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          {/* Company form */}
          {role === 'COMPANY' && (
            <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" placeholder="TechCorp Sri Lanka" {...companyForm.register('companyName')} />
                {companyForm.formState.errors.companyName && (
                  <p className="text-sm text-red-500 mt-1">{companyForm.formState.errors.companyName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="hr@company.com" {...companyForm.register('email')} />
                {companyForm.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">{companyForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min. 8 characters" {...companyForm.register('password')} />
                {companyForm.formState.errors.password && (
                  <p className="text-sm text-red-500 mt-1">{companyForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="industry">Industry (optional)</Label>
                <Input id="industry" placeholder="Information Technology" {...companyForm.register('industry')} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
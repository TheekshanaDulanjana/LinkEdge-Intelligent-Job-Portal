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
import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription,
} from '@/components/ui/card';
import GoogleAuthButton from '@/components/GoogleAuthButton';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleRole, setGoogleRole] = useState<'SEEKER' | 'COMPANY'>('SEEKER');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      router.push(
        user.role === 'SEEKER' ? '/seeker/dashboard' : '/company/dashboard'
      );
    } catch (err: any) {
      setServerError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              {serverError}
              {serverError.includes('verify') && (
                <Link
                  href="/verify-email"
                  className="block mt-1 underline font-medium"
                >
                  Resend verification code
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-purple-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Your password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
     <Button 
  type="submit" 
  variant="gradient" 
  size="md" 
  className="w-full" 
  disabled={loading}
>
  {loading ? 'Signing in...' : 'Sign in'}
</Button>
          </form>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">
                or continue with Google
              </span>
            </div>
          </div>

          {/* Google role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
            {(['SEEKER', 'COMPANY'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setGoogleRole(r)}
                className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                  googleRole === r
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {r === 'SEEKER' ? 'Job Seeker' : 'Company'}
              </button>
            ))}
          </div>
          <GoogleAuthButton role={googleRole} />

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-purple-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
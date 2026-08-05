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
import GoogleAuthButton from '@/components/GoogleAuthButton';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginFormSection() {
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
        user.role === 'SEEKER' ? '/seeker/profile' : '/company/dashboard'
      );
    } catch (err: any) {
      setServerError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[24px] items-center w-full lg:w-1/2 bg-white p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black">Welcome Back!</h2>
          <p className="text-black/60 mt-1 text-sm">Sign in to your account</p>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {serverError}
            {serverError.includes('verify') && (
              <Link href="/verify-email" className="block mt-1 underline font-medium">
                Resend verification code
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input 
              type="email" 
              placeholder="example@domain.com" 
              {...register('email')} 
              className=" h-10"
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Password</Label>
              <Link href="/forgot-password" size="sm" className="text-xs text-gray-400 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <Input 
              type="password" 
              placeholder="Enter your password" 
              {...register('password')} 
              className="h-10"
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <Button type="submit" variant="gradient" className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center "><span className="w-full border-t border-black/50" /></div>
          <div className="relative flex justify-center text-xs ">
            <span className="bg-white px-2 text-black/50">or continue with Google</span>
          </div>
        </div>


        <GoogleAuthButton role={googleRole} />

        <p className="text-center text-sm text-gray-600">
          Don't have an account? <Link href="/register" className="text-blue-600 font-semibold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
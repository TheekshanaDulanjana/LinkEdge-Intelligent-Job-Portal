'use client';

import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2">
      <div className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[16px] items-center w-full max-w-md bg-white p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-black">
              {sent ? 'Check your email' : 'Forgot password'}
            </h2>
            <p className="text-black/60 mt-1 text-sm">
              {sent 
                ? 'We sent a reset link to your inbox' 
                : 'Enter your email to reset your password'}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center">
                <p className="text-gray-600 text-sm">
                  If <strong>{email}</strong> is registered, a password reset link has been sent.
                </p>
              </div>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full h-12">
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="h-10"
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                variant="gradient" 
                className="w-full h-12 mt-4" 
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                  Login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
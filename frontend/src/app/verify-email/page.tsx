'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  function handleChange(index: number, value: string) {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value.replace(/\D/, ''); // digits only
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit() {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/verify-email', { email, code: fullCode });
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      router.push(user.role === 'SEEKER' ? '/seeker/dashboard' : '/company/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } finally { setResending(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <CardTitle>Verify your email</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code sent to<br/><strong>{email}</strong>
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 text-center">{error}</div>
          )}

          {/* Code inputs */}
          <div className="flex gap-2 justify-center mb-6">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-10 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
              />
            ))}
          </div>

          <Button onClick={handleSubmit} className="w-full mb-3" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify email'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Didn&apos;t receive it?{' '}
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="text-purple-600 hover:underline disabled:opacity-50"
            >
              {resent ? 'Code resent!' : resending ? 'Sending...' : 'Resend code'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
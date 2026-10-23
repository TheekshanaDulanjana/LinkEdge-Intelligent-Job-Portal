'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    // If email param is missing, redirect to register
    if (!email) {
      router.push('/register');
      return;
    }
    inputRefs.current[0]?.focus();
  }, [email, router]);

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
    if (fullCode.length < 6) {
      setError('Enter all 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-email', { email, code: fullCode });
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      router.push(user.role === 'SEEKER' ? '/seeker/profile' : '/company/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setError('Email is missing.');
      return;
    }
    setResending(true);
    setError('');
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } catch (err: any) {
      // FIX: Added try...catch to handle unhandledRejection
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-2">
      <div className="flex flex-col justify-center border-2 border-[#0F9DE4] rounded-[16px] items-center w-full max-w-md bg-white p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            {/* Icon */}
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
              <svg className="w-7 h-7 text-[#0F9DE4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-black">Verify your email</h2>
            <p className="text-black/60 mt-1 text-xs">
              Enter the 6-digit code sent to<br />
              <strong className="text-black">{email || 'your email'}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center items-center">
              {error && (
                <div className="p-3 w-58 bg-red-50 border border-red-200 rounded text-sm text-red-600 text-center">
                  {error}
                </div>
              )}
            </div>

            {/* Code inputs */}
            <div className="flex gap-2 justify-center">
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
                  className="w-8 h-10 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0F9DE4] transition-colors"
                />
              ))}
            </div>

            <div className="flex justify-center items-center">
              <Button 
                onClick={handleSubmit} 
                variant="gradient" 
                className="w-64 h-10 mt-2" 
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify email'}
              </Button>
            </div>

            <p className="text-center text-sm text-gray-600">
              Didn&apos;t receive it?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resent}
                className="text-[#0F9DE4] font-semibold hover:underline disabled:opacity-50"
              >
                {resent ? 'Code resent!' : resending ? 'Sending...' : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
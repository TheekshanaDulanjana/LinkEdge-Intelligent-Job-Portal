'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

function DeleteAccountContent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  async function handleDelete() {
    if (confirm !== 'DELETE MY ACCOUNT') {
      setError('Please type the confirmation text exactly');
      return;
    }
    setLoading(true); setError('');
    try {
      await api.delete('/auth/account', { data: { password } });
      logout();
      router.push('/?deleted=true');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    } finally { setLoading(false); }
  }

  const backPath = user?.role === 'SEEKER' ? '/seeker/profile' : '/company/dashboard';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href={backPath} className="text-sm text-purple-600 hover:underline mb-6 block">
          ← Back to profile
        </Link>

        <div className="bg-white rounded-xl border border-red-100 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-red-700">Delete account</h1>
          </div>

          {step === 'warning' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-700 mb-2">This action is permanent and cannot be undone.</p>
                <ul className="text-sm text-red-600 space-y-1">
                  <li>• Your profile and all personal data will be deleted</li>
                  {user?.role === 'SEEKER' && <li>• All your job applications will be removed</li>}
                  {user?.role === 'COMPANY' && <li>• All your job postings and applicant data will be removed</li>}
                  <li>• Your interview sessions and history will be deleted</li>
                  <li>• You cannot recover this account after deletion</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Link href={backPath} className="flex-1">
                  <Button variant="outline" className="w-full">Cancel</Button>
                </Link>
                <Button
                  onClick={() => setStep('confirm')}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  I understand, continue
                </Button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}
              <div className="space-y-4 mb-6">
                <div>
                  <Label>Your password</Label>
                  <Input
                    type="password"
                    placeholder="Enter your password to confirm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    Type <span className="font-mono font-bold text-red-600">DELETE MY ACCOUNT</span> to confirm
                  </Label>
                  <Input
                    placeholder="DELETE MY ACCOUNT"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('warning')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={loading || confirm !== 'DELETE MY ACCOUNT'}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40"
                >
                  {loading ? 'Deleting...' : 'Permanently delete account'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  return <AuthGuard><DeleteAccountContent /></AuthGuard>;
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

function DeleteAccountContent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  // Global Header eka hide kirima me page ekedi
  useEffect(() => {
    const headerElement = document.querySelector('header');
    if (headerElement) {
      headerElement.style.display = 'none';
    }
    return () => {
      if (headerElement) {
        headerElement.style.display = '';
      }
    };
  }, []);

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
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md">
        <Link href={backPath} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0025B8] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to profile
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-rose-100 p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delete account</h1>
              <p className="text-xs text-rose-600 font-medium">Irreversible security action</p>
            </div>
          </div>

          {step === 'warning' && (
            <>
              <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 mb-6 space-y-3">
                <p className="text-xs font-bold text-rose-900 leading-relaxed">This action is permanent and cannot be undone.</p>
                <ul className="text-xs text-rose-700 space-y-2 font-medium">
                  <li className="flex items-start gap-2"><span>•</span><span>Your profile and all personal data will be deleted</span></li>
                  {user?.role === 'SEEKER' && <li className="flex items-start gap-2"><span>•</span><span>All your job applications will be removed</span></li>}
                  {user?.role === 'COMPANY' && <li className="flex items-start gap-2"><span>•</span><span>All your job postings and applicant data will be removed</span></li>}
                  <li className="flex items-start gap-2"><span>•</span><span>Your interview sessions and history will be deleted</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>You cannot recover this account after deletion</span></li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Link href={backPath} className="flex-1">
                  <Button variant="outline" className="w-full rounded-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer">Cancel</Button>
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    onClick={() => setStep('confirm')}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-full h-11 font-bold text-xs shadow-md cursor-pointer"
                  >
                    I understand, continue
                  </Button>
                </motion.div>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium shadow-sm"
                >
                  {error}
                </motion.div>
              )}
              <div className="space-y-4 mb-6">
                <div>
                  <Label className="text-xs font-bold text-slate-700 block mb-1.5">Your password</Label>
                  <Input
                    type="password"
                    placeholder="Enter your password to confirm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-sky-100 bg-slate-50/50 rounded-xl text-xs focus-visible:ring-rose-500 shadow-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Type <span className="font-mono font-extrabold text-rose-600">DELETE MY ACCOUNT</span> to confirm
                  </Label>
                  <Input
                    placeholder="DELETE MY ACCOUNT"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-11 border-sky-100 bg-slate-50/50 rounded-2xl text-xs focus-visible:ring-rose-500 shadow-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('warning')} className="flex-1 rounded-full h-11 text-xs border-slate-200 font-semibold cursor-pointer">
                  Back
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    onClick={handleDelete}
                    disabled={loading || confirm !== 'DELETE MY ACCOUNT'}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-full h-11 text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? 'Deleting...' : 'Permanently delete account'}
                  </Button>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function DeleteAccountPage() {
  return <AuthGuard><DeleteAccountContent /></AuthGuard>;
}
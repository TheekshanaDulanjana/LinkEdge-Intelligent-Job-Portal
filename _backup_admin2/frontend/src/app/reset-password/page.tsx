'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters').max(72, 'At most 72 characters')
    .regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  async function handleSubmit() {
    const result = schema.safeParse(form);
    if (!result.success) {
      const e: Record<string, string> = {};
      result.error.issues.forEach((err) => { e[String(err.path[0])] = err.message; });
      setErrors(e); return;
    }
    setLoading(true); setServerError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.password });
      setDone(true);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{done ? 'Password updated!' : 'Set new password'}</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-6">Your password has been updated. You can now log in.</p>
              <Link href="/login"><Button className="w-full">Go to login</Button></Link>
            </div>
          ) : (
            <>
              {serverError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{serverError}</div>}
              {!token && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">Invalid or missing reset token.</div>}
              <div className="space-y-4">
                <div>
                  <Label>New password</Label>
                  <Input type="password" maxLength={72} autoComplete="new-password" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <Input type="password" placeholder="Repeat password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}/>
                  {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={loading || !token}>
                  {loading ? 'Updating...' : 'Update password'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
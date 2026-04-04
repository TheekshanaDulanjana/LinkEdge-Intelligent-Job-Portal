'use client';

import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email) { setError('Enter your email'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{sent ? 'Check your email' : 'Forgot password'}</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-6">
                If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox.
              </p>
              <Link href="/login"><Button variant="outline" className="w-full">Back to login</Button></Link>
            </div>
          ) : (
            <>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>}
              <div className="mb-4">
                <Label>Email address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"/>
              </div>
              <Button onClick={handleSubmit} className="w-full mb-3" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-gray-500">
                <Link href="/login" className="text-purple-600 hover:underline">Back to login</Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
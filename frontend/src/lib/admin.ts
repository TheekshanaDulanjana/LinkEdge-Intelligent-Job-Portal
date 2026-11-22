import { useCallback, useEffect, useState } from 'react';
import { adminApi } from './api';

/** Message to show for a failed admin API call. */
export function errMsg(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const m = (e as { message?: string })?.message;
  return m && typeof m === 'string' ? m : fallback;
}

export function fmtDate(v?: string | Date | null, withTime = true): string {
  if (!v) return '–';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(v?: string | Date | null): string {
  if (!v) return 'never';
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(v, false);
}

export interface Paged<T> { total: number; page: number; totalPages: number; items: T[] }

export interface AdminUserRow {
  id: string; email: string; role: 'SEEKER' | 'COMPANY'; status: 'ACTIVE' | 'DISABLED';
  isEmailVerified: boolean; authProvider: string; createdAt: string; lastLoginAt: string | null;
  name: string; image: string | null; location: string | null; industry: string | null;
}
export interface AdminJobRow {
  id: string; title: string; status: string; location: string; jobType: string; deadline: string; createdAt: string;
  companyId: string; companyName: string; companyLogo: string | null; companyUserId: string | null;
  applicationCount: number; moderationReason: string | null; moderatedAt: string | null;
}
export interface AuditRow {
  id: string; actorEmail: string; action: string; targetType: string | null; targetId: string | null;
  targetLabel: string | null; reason: string | null; ip: string | null; createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export const adminGet = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> =>
  (await adminApi.get(url, { params })).data.data as T;
export const adminSend = async <T = unknown,>(method: 'post' | 'put' | 'patch' | 'delete', url: string, body?: unknown): Promise<T> =>
  (await adminApi.request({ method, url, data: body })).data.data as T;

const ACTION_LABELS: Record<string, string> = {
  'admin.login': 'Admin signed in', 'admin.login_failed': 'Failed admin sign-in', 'admin.login_blocked': 'Blocked admin sign-in (locked)',
  'admin.logout': 'Admin signed out', 'admin.password_changed': 'Admin changed password', 'admin.password_change_failed': 'Failed password change',
  'admin.owner_created': 'Owner account created', 'admin.created': 'Admin created', 'admin.disabled': 'Admin disabled',
  'admin.enabled': 'Admin enabled', 'admin.password_reset': 'Admin password reset', 'admin.password_reset_requested': 'Password reset requested', 'admin.email_change_requested': 'Email change requested', 'admin.email_changed': 'Admin email changed', 'admin.email_change_failed': 'Failed email change', 'admin.password_reset_cli': 'Owner password reset (CLI)',
  'user.disabled': 'User disabled', 'user.enabled': 'User enabled', 'user.deleted': 'User deleted',
  'job.hidden': 'Job hidden', 'job.restored': 'Job restored', 'job.deleted': 'Job deleted',
  'content.updated': 'Content updated', 'content.reset': 'Content reset to default', 'content.image_uploaded': 'Image uploaded',
};
export const actionLabel = (a: string) => ACTION_LABELS[a] ?? a;

/** Loads an admin endpoint and re-loads when the URL or params change. */
export function useAdminQuery<T>(url: string, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params ?? {});
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await adminGet<T>(url, JSON.parse(key))); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [url, key]);
  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load };
}

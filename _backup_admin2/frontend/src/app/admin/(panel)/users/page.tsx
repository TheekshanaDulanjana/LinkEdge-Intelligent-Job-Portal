'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { adminGet, AdminUserRow, errMsg, fmtDate, timeAgo } from '@/lib/admin';
import { Card, Empty, ErrorBox, Pagination, RolePill, Spinner, UserStatusPill, inputCls, td, th, useDebounced } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { assetUrl } from '@/lib/assetUrl';

interface Resp { users: AdminUserRow[]; total: number; page: number; totalPages: number }
const TABS = [{ v: '', l: 'All' }, { v: 'SEEKER', l: 'Job seekers' }, { v: 'COMPANY', l: 'Companies' }];

function Avatar({ u }: { u: AdminUserRow }) {
  const src = u.image ? assetUrl(u.image) : '';
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
    : <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center">{u.name.charAt(0).toUpperCase()}</span>;
}

function UsersList() {
  const router = useRouter();
  const sp = useSearchParams();
  const [role, setRole] = useState(sp.get('role') ?? '');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await adminGet<Resp>('/users', { role: role || undefined, status: status || undefined, q: dq || undefined, page, limit: 20 })); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [role, status, dq, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [role, status, dq]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-600 mt-1">Job seekers and companies. Open an account to see the profile and manage it.</p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50" role="tablist">
            {TABS.map((t) => (
              <button key={t.v} role="tab" aria-selected={role === t.v} onClick={() => setRole(t.v)}
                className={cn('px-3 h-8 rounded-md text-sm font-medium cursor-pointer', role === t.v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
                {t.l}
              </button>
            ))}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputCls, 'w-auto')} aria-label="Status">
            <option value="">Any status</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option>
          </select>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className={cn(inputCls, 'pl-9')} aria-label="Search users" />
          </div>
        </div>

        {error ? <div className="p-4"><ErrorBox message={error} onRetry={load} /></div>
          : loading && !data ? <Spinner />
          : !data || data.users.length === 0 ? <Empty>No users match these filters.</Empty>
          : (
            <>
              <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
                <table className="w-full min-w-[760px]">
                  <thead><tr>
                    <th className={th}>Name</th><th className={th}>Type</th><th className={th}>Status</th>
                    <th className={th}>Verified</th><th className={th}>Joined</th><th className={th}>Last sign-in</th>
                  </tr></thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} onClick={() => router.push(`/admin/users/${u.id}`)} className="hover:bg-slate-50 cursor-pointer">
                        <td className={td}>
                          <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <Avatar u={u} />
                            <span className="min-w-0"><span className="block font-medium text-slate-900 truncate max-w-[260px]">{u.name}</span>
                              <span className="block text-xs text-slate-500 truncate max-w-[260px]">{u.email}</span></span>
                          </Link>
                        </td>
                        <td className={td}><RolePill role={u.role} /></td>
                        <td className={td}><UserStatusPill status={u.status} /></td>
                        <td className={td}>{u.isEmailVerified ? 'Yes' : <span className="text-amber-700">No</span>}</td>
                        <td className={cn(td, 'whitespace-nowrap')}>{fmtDate(u.createdAt, false)}</td>
                        <td className={cn(td, 'whitespace-nowrap text-slate-500')}>{timeAgo(u.lastLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
            </>
          )}
      </Card>
    </div>
  );
}

export default function UsersPage() {
  return <Suspense fallback={<Spinner />}><UsersList /></Suspense>;
}

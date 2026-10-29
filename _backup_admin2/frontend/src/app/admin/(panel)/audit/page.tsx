'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { actionLabel, adminGet, AuditRow, errMsg, fmtDate } from '@/lib/admin';
import { Card, Empty, ErrorBox, PageHeader, Pagination, Pill, Spinner, inputCls, td, th, useDebounced } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface Resp { logs: AuditRow[]; actions: string[]; total: number; page: number; totalPages: number }

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await adminGet<Resp>('/audit', { action: action || undefined, q: dq || undefined, page, limit: 25 })); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [action, dq, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [action, dq]);

  const tone = (a: string) => a.includes('delete') || a.includes('failed') || a.includes('blocked') || a.includes('disabled') || a.includes('hidden') ? 'rose' : a.startsWith('content') ? 'blue' : 'slate';

  return (
    <div>
      <PageHeader title="Audit log" description="Every admin action: who did what, to whom, why, and from which address. Entries cannot be edited or deleted." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
          <select value={action} onChange={(e) => setAction(e.target.value)} className={cn(inputCls, 'w-auto max-w-[260px]')} aria-label="Action">
            <option value="">All actions</option>
            {data?.actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search admin, target or reason" className={cn(inputCls, 'pl-9')} aria-label="Search audit log" />
          </div>
        </div>
        {error ? <div className="p-4"><ErrorBox message={error} onRetry={load} /></div>
          : loading && !data ? <Spinner />
          : !data || data.logs.length === 0 ? <Empty>No entries.</Empty>
          : (
            <>
              <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
                <table className="w-full min-w-[900px]">
                  <thead><tr><th className={th}>When</th><th className={th}>Admin</th><th className={th}>Action</th><th className={th}>Target</th><th className={th}>Reason</th><th className={th}>IP</th></tr></thead>
                  <tbody>
                    {data.logs.map((l) => (
                      <tr key={l.id}>
                        <td className={cn(td, 'whitespace-nowrap text-slate-500')}>{fmtDate(l.createdAt)}</td>
                        <td className={cn(td, 'max-w-[200px] truncate')}>{l.actorEmail}</td>
                        <td className={td}><Pill tone={tone(l.action)}>{actionLabel(l.action)}</Pill></td>
                        <td className={cn(td, 'max-w-[240px] truncate')} title={l.targetLabel ?? ''}>{l.targetLabel ?? '–'}</td>
                        <td className={cn(td, 'max-w-[280px]')}><span className="line-clamp-2" title={l.reason ?? ''}>{l.reason ?? '–'}</span></td>
                        <td className={cn(td, 'text-slate-500 whitespace-nowrap')}>{l.ip ?? '–'}</td>
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

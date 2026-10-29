'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Plus, UserCheck, UserX } from 'lucide-react';
import { adminGet, adminSend, errMsg, fmtDate, timeAgo } from '@/lib/admin';
import { useAuthStore } from '@/store/authStore';
import { Btn, Card, Empty, ErrorBox, Modal, PageHeader, Pill, ReasonDialog, Spinner, TextInput, td, th, useToast } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface Admin { id: string; email: string; adminLevel: string | null; status: 'ACTIVE' | 'DISABLED'; lastLoginAt: string | null; createdAt: string; mustChangePassword: boolean }

export default function AdminsPage() {
  const router = useRouter();
  const toast = useToast();
  const me = useAuthStore((s) => s.user);
  const [list, setList] = useState<Admin[] | null>(null);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviteErr, setInviteErr] = useState('');
  const [toggle, setToggle] = useState<Admin | null>(null);

  const load = useCallback(async () => {
    setError('');
    try { setList(await adminGet<Admin[]>('/admins')); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { if (me && me.adminLevel !== 'OWNER') router.replace('/admin'); else void load(); }, [me, router, load]);

  async function create() {
    setBusy(true); setInviteErr('');
    try {
      await adminSend('post', '/admins', { email, name });
      toast('ok', `Invitation sent to ${email}.`);
      setInvite(false); setEmail(''); setName(''); await load();
    } catch (e) { setInviteErr(errMsg(e)); } finally { setBusy(false); }
  }
  async function reset(a: Admin) {
    try { await adminSend('post', `/admins/${a.id}/reset-password`); toast('ok', `A new temporary password was emailed to ${a.email}.`); await load(); }
    catch (e) { toast('error', errMsg(e)); }
  }

  return (
    <div>
      <PageHeader title="Administrators" description="Only the owner can add or manage administrators. New admins get a temporary password by email and must change it at first sign-in."
        actions={<Btn variant="primary" onClick={() => setInvite(true)}><Plus className="w-4 h-4" />Add administrator</Btn>} />
      <Card>
        {error ? <div className="p-4"><ErrorBox message={error} onRetry={load} /></div>
          : !list ? <Spinner />
          : list.length === 0 ? <Empty>No administrators.</Empty>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead><tr><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Last sign-in</th><th className={th}>Created</th><th className={cn(th, 'text-right')}>Actions</th></tr></thead>
                <tbody>
                  {list.map((a) => {
                    const owner = a.adminLevel === 'OWNER';
                    return (
                      <tr key={a.id}>
                        <td className={td}>{a.email}{a.id === me?.id && <span className="text-xs text-slate-500"> (you)</span>}</td>
                        <td className={td}><Pill tone={owner ? 'blue' : 'slate'}>{owner ? 'Owner' : 'Administrator'}</Pill></td>
                        <td className={td}>{a.status === 'ACTIVE' ? <Pill tone="green">Active</Pill> : <Pill tone="rose">Disabled</Pill>}{a.mustChangePassword && <Pill tone="amber">Temp password</Pill>}</td>
                        <td className={cn(td, 'text-slate-500')}>{timeAgo(a.lastLoginAt)}</td>
                        <td className={cn(td, 'whitespace-nowrap')}>{fmtDate(a.createdAt, false)}</td>
                        <td className={td}>
                          {!owner && a.id !== me?.id && (
                            <div className="flex justify-end gap-1.5">
                              <Btn size="sm" onClick={() => reset(a)}><KeyRound className="w-3.5 h-3.5" />Reset password</Btn>
                              <Btn size="sm" onClick={() => setToggle(a)}>{a.status === 'ACTIVE' ? <><UserX className="w-3.5 h-3.5" />Disable</> : <><UserCheck className="w-3.5 h-3.5" />Enable</>}</Btn>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      <Modal open={invite} onClose={() => !busy && setInvite(false)} title="Add administrator"
        footer={<><Btn onClick={() => setInvite(false)} disabled={busy}>Cancel</Btn><Btn variant="primary" busy={busy} disabled={!email.includes('@') || name.trim().length < 2} onClick={create}>Send invitation</Btn></>}>
        <TextInput label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} hint="A temporary password is generated and emailed to this address." />
        {inviteErr && <p className="text-sm text-rose-600">{inviteErr}</p>}
      </Modal>

      <ReasonDialog
        open={!!toggle} onClose={() => setToggle(null)} danger={toggle?.status === 'ACTIVE'}
        title={toggle?.status === 'ACTIVE' ? 'Disable administrator?' : 'Enable administrator?'}
        confirmLabel={toggle?.status === 'ACTIVE' ? 'Disable' : 'Enable'}
        description={<>{toggle?.email}</>} notice="The reason is saved in the audit log."
        onConfirm={async (reason) => {
          await adminSend('patch', `/admins/${toggle!.id}/status`, { status: toggle!.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE', reason });
          toast('ok', 'Administrator updated.'); setToggle(null); await load();
        }}
      />
    </div>
  );
}

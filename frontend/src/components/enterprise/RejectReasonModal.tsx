'use client';

import { useState } from 'react';
import { rejectCandidate } from '@/lib/jobApplicants';
import { Modal, btnDanger, btnSecondary, cx } from '@/components/enterprise/dashboard/kit';

const REASONS = [
  'Qualifications do not match the role',
  'Insufficient experience',
  'Missing required technical skills',
  'Position requirements changed',
  'Profile better suited for another role',
  'Salary expectations do not align',
  'Selected another candidate',
];

export default function RejectReasonModal({
  applicationId, candidateName, onClose, onRejected,
}: { applicationId: string; candidateName: string; onClose: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setError('');
    setSaving(true);
    try {
      await rejectCandidate(applicationId, reason);
      onRejected();
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to reject the candidate.');
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Reject candidate" subtitle={candidateName}
      footer={<>
        <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
        <button type="submit" form="reject-form" disabled={!reason || saving} className={btnDanger}>{saving ? 'Rejecting…' : 'Reject and notify'}</button>
      </>}>
      <form id="reject-form" onSubmit={handleSubmit} className="space-y-2">
        {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
        <p className="text-xs font-semibold text-slate-700 mb-1">Select a reason</p>
        {REASONS.map(r => (
          <label key={r} className={cx('flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer text-[13px] transition-colors',
            reason === r ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-rose-600" />
            {r}
          </label>
        ))}
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 leading-relaxed mt-3">
          A personalised explanation based on this candidate’s CV is generated and emailed to them.
        </p>
      </form>
    </Modal>
  );
}

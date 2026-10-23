'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { rejectCandidate } from '@/lib/jobApplicants';

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
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setError('');
    setSaving(true);
    try {
      await rejectCandidate(applicationId, reason);
      onRejected();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to reject candidate');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Reject Candidate</h3>
            <p className="text-xs text-gray-400 mt-0.5">{candidateName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-2">
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">{error}</div>}

          <p className="text-xs font-medium text-gray-500 mb-2">Select a reason</p>
          {REASONS.map(r => (
            <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors
              ${reason === r ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
              {r}
            </label>
          ))}

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 mt-3">
            A personalised explanation will be generated based on this candidate's CV and emailed to them automatically.
          </p>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!reason || saving} className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Rejecting...' : 'Reject & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
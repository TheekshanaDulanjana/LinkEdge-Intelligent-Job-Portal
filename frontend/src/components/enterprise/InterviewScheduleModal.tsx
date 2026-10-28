'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { scheduleInterview } from '@/lib/jobApplicants';
import { Modal, Field, inputCls, btnPrimary, btnSecondary } from '@/components/enterprise/dashboard/kit';

function localToday() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function InterviewScheduleModal({
  applicationId, candidateName, onClose, onScheduled,
}: { applicationId: string; candidateName: string; onClose: () => void; onScheduled: () => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await scheduleInterview(applicationId, { interviewDate: date, interviewTime: time, interviewVenue: venue });
      onScheduled();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to schedule the interview. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Schedule interview" subtitle={candidateName}
      footer={<>
        <button type="button" onClick={onClose} disabled={saving} className={btnSecondary}>Cancel</button>
        <button type="submit" form="interview-form" disabled={saving} className={btnPrimary}><CalendarClock className="w-3.5 h-3.5" />{saving ? 'Scheduling…' : 'Schedule and notify'}</button>
      </>}>
      <form id="interview-form" onSubmit={handleSubmit} className="space-y-3.5">
        {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required><input required type="date" min={localToday()} value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Time" required><input required type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Venue or meeting link" required><input required value={venue} onChange={e => setVenue(e.target.value)} placeholder="Office address, Zoom or Meet link" className={inputCls} /></Field>
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3 leading-relaxed">
          The candidate gets an email invite with these details, and the interview appears on your calendar automatically.
        </p>
      </form>
    </Modal>
  );
}

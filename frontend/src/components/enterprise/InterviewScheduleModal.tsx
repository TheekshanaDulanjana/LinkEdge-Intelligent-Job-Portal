'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { scheduleInterview } from '@/lib/jobApplicants';

export default function InterviewScheduleModal({
  applicationId, candidateName, onClose, onScheduled,
}: { applicationId: string; candidateName: string; onClose: () => void; onScheduled: () => void }) {
  const [date, setDate]   = useState('');
  const [time, setTime]   = useState('10:00');
  const [venue, setVenue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await scheduleInterview(applicationId, { interviewDate: date, interviewTime: time, interviewVenue: venue });
      onScheduled();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Failed to schedule interview. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Schedule Interview</h3>
            <p className="text-xs text-gray-400 mt-0.5">{candidateName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><Calendar className="w-3.5 h-3.5" /> Interview Date</span>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5" /> Interview Time</span>
            <input required type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" /> Venue / Meeting Link</span>
            <input required value={venue} onChange={(e) => setVenue(e.target.value)}
              placeholder="Office address or Zoom/Meet link"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </label>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5">
            The candidate will receive an email invite with these exact details, and this event will automatically appear on your Calendar.
          </p>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Scheduling...' : 'Schedule & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
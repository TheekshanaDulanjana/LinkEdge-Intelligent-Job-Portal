'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createCalendarEvent } from '@/lib/calendar';

const TYPE_OPTIONS = [
  { value: 'MEETING',  label: 'Company Meeting', color: 'indigo' },
  { value: 'DEADLINE', label: 'Hiring Deadline',  color: 'red' },
  { value: 'REMINDER', label: 'Reminder',         color: 'green' },
];

export default function EventFormModal({
  defaultDate, onClose, onCreated,
}: { defaultDate: Date; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('MEETING');
  const [date, setDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const type = TYPE_OPTIONS.find(t => t.value === eventType);
      await createCalendarEvent({
        title, description, eventType,
        startTime: `${date}T${startTime}:00`,
        endTime:   `${date}T${endTime}:00`,
        location,
        color: type?.color ?? 'indigo',
      });
      onCreated();
      onClose();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">New Event</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <input
            required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)" rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
          />
          <select
            value={eventType} onChange={(e) => setEventType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            required type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
          <div className="flex gap-2">
            <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <input
            value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
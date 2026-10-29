'use client';

import { useState } from 'react';
import { createCalendarEvent } from '@/lib/calendar';
import { Modal, Field, inputCls, selectCls, textareaCls, btnPrimary, btnSecondary } from '@/components/enterprise/dashboard/kit';

const TYPE_OPTIONS = [
  { value: 'MEETING',  label: 'Company meeting', color: 'indigo' },
  { value: 'DEADLINE', label: 'Hiring deadline',  color: 'red' },
  { value: 'REMINDER', label: 'Reminder',         color: 'green' },
];

function localDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function EventFormModal({
  defaultDate, onClose, onCreated,
}: { defaultDate: Date; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('MEETING');
  const [date, setDate] = useState(localDate(defaultDate));
  const [startTime, setStartTime] = useState(defaultDate.getHours() >= 7 && defaultDate.getHours() < 19 ? `${String(defaultDate.getHours()).padStart(2, '0')}:00` : '09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (endTime <= startTime) { setError('End time must be after the start time.'); return; }
    setSaving(true); setError('');
    try {
      const type = TYPE_OPTIONS.find(t => t.value === eventType);
      await createCalendarEvent({
        title, description, eventType,
        startTime: `${date}T${startTime}:00`,
        endTime: `${date}T${endTime}:00`,
        location,
        color: type?.color ?? 'indigo',
      });
      onCreated();
      onClose();
    } catch (err) { console.error(err); setError('Could not create the event. Try again.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="New event" subtitle="Add a meeting, deadline or reminder to your calendar."
      footer={<>
        <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
        <button type="submit" form="event-form" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Create event'}</button>
      </>}>
      <form id="event-form" onSubmit={handleSubmit} className="space-y-3.5">
        {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
        <Field label="Title" required><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hiring sync" className={inputCls} /></Field>
        <Field label="Type">
          <select value={eventType} onChange={e => setEventType(e.target.value)} className={selectCls}>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" required className="col-span-3 sm:col-span-1"><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Starts" required><input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} /></Field>
          <Field label="Ends" required><input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Location" hint="Optional"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Room, address or meeting link" className={inputCls} /></Field>
        <Field label="Notes" hint="Optional"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={textareaCls} /></Field>
      </form>
    </Modal>
  );
}

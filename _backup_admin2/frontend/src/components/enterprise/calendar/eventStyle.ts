import type { CalendarEvent } from '@/lib/calendar';

export const EVENT_STYLE: Record<string, { label: string; chip: string; dot: string; bar: string }> = {
  INTERVIEW: { label: 'Interview', chip: 'bg-brand-50 text-brand-800 border-brand-200', dot: 'bg-brand-500', bar: 'border-l-brand-500' },
  MEETING:   { label: 'Meeting',   chip: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600', bar: 'border-l-indigo-600' },
  DEADLINE:  { label: 'Deadline',  chip: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', bar: 'border-l-rose-500' },
  REMINDER:  { label: 'Reminder',  chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', bar: 'border-l-emerald-500' },
};

export function styleFor(e: Pick<CalendarEvent, 'eventType'>) {
  return EVENT_STYLE[e.eventType] ?? EVENT_STYLE.MEETING;
}

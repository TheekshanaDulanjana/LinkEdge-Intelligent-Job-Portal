import type { CalendarEvent } from '@/lib/calendar';

export const EVENT_STYLE: Record<string, { label: string; chip: string; dot: string; bar: string }> = {
  INTERVIEW: { label: 'Interview', chip: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500', bar: 'border-l-sky-500' },
  MEETING:   { label: 'Meeting',   chip: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600', bar: 'border-l-blue-600' },
  DEADLINE:  { label: 'Deadline',  chip: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', bar: 'border-l-rose-500' },
  REMINDER:  { label: 'Reminder',  chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', bar: 'border-l-emerald-500' },
};

export function styleFor(e: Pick<CalendarEvent, 'eventType'>) {
  return EVENT_STYLE[e.eventType] ?? EVENT_STYLE.MEETING;
}

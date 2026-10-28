'use client';

import { CalendarEvent } from '@/lib/calendar';
import DraggableEvent from './DraggableEvent';
import DroppableDay from './DroppableDay';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DayView({
  date, events, onEventClick, onSlotClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
}) {
  function eventsForHour(hour: number) {
    return events.filter(e => {
      const start = new Date(e.startTime);
      return sameDay(start, date) && start.getHours() === hour;
    });
  }

  return (
    <div>
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{date.toLocaleDateString('en-US', { weekday: 'long' })}</p>
        <p className="text-base font-semibold text-slate-900">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
      <div>
        {HOURS.map(hour => {
          const slotDate = new Date(date);
          slotDate.setHours(hour, 0, 0, 0);
          return (
            <div key={hour} className="flex border-b border-slate-100">
              <div className="w-16 shrink-0 text-[11px] text-slate-400 text-right pr-3 pt-2 tabular-nums">
                {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              <DroppableDay id={`slot-${slotDate.toISOString()}`} date={slotDate}
                className="flex-1 min-h-[60px] p-1.5 border-l border-slate-100 cursor-pointer hover:bg-slate-50/60">
                <div onClick={() => onSlotClick(slotDate)} className="min-h-[48px] space-y-1">
                  {eventsForHour(hour).map(ev => (
                    <DraggableEvent key={ev.id} event={ev} compact={false} onClick={() => onEventClick(ev)} />
                  ))}
                </div>
              </DroppableDay>
            </div>
          );
        })}
      </div>
    </div>
  );
}

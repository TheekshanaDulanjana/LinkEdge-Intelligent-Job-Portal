'use client';

import { CalendarEvent } from '@/lib/calendar';
import DraggableEvent from './DraggableEvent';
import DroppableDay from './DroppableDay';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am – 7pm

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function WeekView({
  weekStart, events, onEventClick, onSlotClick,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const today = new Date();

  function eventsForSlot(day: Date, hour: number) {
    return events.filter(e => {
      const start = new Date(e.startTime);
      return sameDay(start, day) && start.getHours() === hour;
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/70 sticky top-0">
          <div />
          {days.map(d => (
            <div key={d.toISOString()} className="text-center py-2.5 border-l border-slate-100">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <p className={`text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full
                ${sameDay(d, today) ? 'bg-[#0025B8] text-white' : 'text-slate-700'}`}>{d.getDate()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          {HOURS.map(hour => (
            <div key={hour} className="contents">
              <div className="text-[10px] text-slate-400 text-right pr-2 pt-1 border-b border-slate-100 tabular-nums">
                {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              {days.map(day => {
                const slotDate = new Date(day);
                slotDate.setHours(hour, 0, 0, 0);
                return (
                  <DroppableDay
                    key={`${day.toISOString()}-${hour}`}
                    id={`slot-${slotDate.toISOString()}`}
                    date={slotDate}
                    className={`min-h-[56px] border-b border-l border-slate-100 p-0.5 space-y-0.5 cursor-pointer hover:bg-slate-50/60 ${sameDay(day, today) ? 'bg-sky-50/30' : ''}`}
                  >
                    <div onClick={() => onSlotClick(slotDate)} className="min-h-[52px] space-y-0.5">
                      {eventsForSlot(day, hour).map(ev => (
                        <DraggableEvent key={ev.id} event={ev} compact={false} onClick={() => onEventClick(ev)} />
                      ))}
                    </div>
                  </DroppableDay>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

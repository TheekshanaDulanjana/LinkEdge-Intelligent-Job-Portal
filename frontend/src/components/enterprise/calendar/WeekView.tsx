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
      <div className="min-w-[720px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100">
          <div />
          {days.map(d => (
            <div key={d.toISOString()} className="text-center py-2">
              <p className="text-xs text-gray-400">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <p className={`text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full
                ${sameDay(d, today) ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>
                {d.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map(hour => (
            <div key={hour} className="contents">
              <div className="text-[10px] text-gray-400 text-right pr-2 pt-1 border-r border-gray-50">
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
                    className="min-h-[52px] border-b border-r border-gray-50 p-0.5 space-y-0.5 cursor-pointer hover:bg-gray-50/50"
                  >
                    <div onClick={() => onSlotClick(slotDate)} className="min-h-[48px]">
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
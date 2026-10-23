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
      <div className="text-center py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400">{date.toLocaleDateString('en-US', { weekday: 'long' })}</p>
        <p className="text-lg font-semibold text-gray-900 mt-0.5">
          {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {HOURS.map(hour => {
          const slotDate = new Date(date);
          slotDate.setHours(hour, 0, 0, 0);
          const hourEvents = eventsForHour(hour);

          return (
            <div key={hour} className="flex border-b border-gray-50">
              <div className="w-16 flex-shrink-0 text-xs text-gray-400 text-right pr-3 pt-2">
                {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              <DroppableDay
                id={`slot-${slotDate.toISOString()}`}
                date={slotDate}
                className="flex-1 min-h-[60px] p-1.5 space-y-1 cursor-pointer hover:bg-gray-50/50"
              >
                <div onClick={() => onSlotClick(slotDate)} className="min-h-[52px]">
                  {hourEvents.length === 0 ? null : hourEvents.map(ev => (
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
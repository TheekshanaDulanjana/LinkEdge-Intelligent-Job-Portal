'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEvent } from '@/lib/calendar';
import { styleFor } from './eventStyle';

export default function DraggableEvent({
  event, onClick, compact = true,
}: { event: CalendarEvent; onClick?: () => void; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: event.isSystemGenerated && event.eventType !== 'INTERVIEW', // interviews ARE draggable
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  } : undefined;

  const s = styleFor(event);
  const time = new Date(event.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`cursor-grab active:cursor-grabbing rounded-md border border-l-[3px] truncate transition-shadow hover:shadow-sm ${s.chip} ${s.bar}
        ${compact ? 'text-[10.5px] px-1.5 py-0.5' : 'text-xs px-2 py-1.5'}`}
      title={event.title}
    >
      {compact
        ? <p className="font-medium truncate"><span className="opacity-60 tabular-nums mr-1">{time}</span>{event.title}</p>
        : (<>
            <p className="opacity-70 tabular-nums">{time}</p>
            <p className="font-semibold truncate">{event.title}</p>
          </>)}
    </div>
  );
}

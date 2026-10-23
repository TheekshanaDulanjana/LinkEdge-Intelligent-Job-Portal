'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEvent } from '@/lib/calendar';

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  red:    'bg-red-100 text-red-600 border-red-200',
  green:  'bg-green-100 text-green-700 border-green-200',
};

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
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`cursor-grab active:cursor-grabbing rounded border truncate transition-shadow hover:shadow-sm
        ${COLOR_MAP[event.color ?? 'indigo']}
        ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1.5'}`}
      title={event.title}
    >
      {!compact && (
        <p className="opacity-70">
          {new Date(event.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      <p className="font-medium truncate">{event.title}</p>
    </div>
  );
}
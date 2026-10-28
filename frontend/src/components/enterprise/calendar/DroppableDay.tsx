'use client';

import { useDroppable } from '@dnd-kit/core';

export default function DroppableDay({
  id, date, children, className,
}: { id: string; date: Date; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { date } });

  return (
    <div ref={setNodeRef} className={`${className ?? ''} ${isOver ? '!bg-sky-50 ring-2 ring-inset ring-[#0F9DE4]/50' : ''}`}>
      {children}
    </div>
  );
}

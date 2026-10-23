'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2 } from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import EventFormModal from '@/components/enterprise/EventFormModal';
import DraggableEvent from '@/components/enterprise/calendar/DraggableEvent';
import DroppableDay from '@/components/enterprise/calendar/DroppableDay';
import WeekView from '@/components/enterprise/calendar/WeekView';
import DayView from '@/components/enterprise/calendar/DayView';
import {
  fetchCalendarEvents, deleteCalendarEvent, rescheduleEvent, rescheduleInterview,
  CalendarEvent,
} from '@/lib/calendar';

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  red:    'bg-red-100 text-red-600 border-red-200',
  green:  'bg-green-100 text-green-700 border-green-200',
};

type ViewMode = 'month' | 'week' | 'day';

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }
function startOfWeek(d: Date)  { const r = new Date(d); r.setDate(d.getDate() - d.getDay()); r.setHours(0, 0, 0, 0); return r; }
function endOfWeek(d: Date)    { const r = startOfWeek(d); r.setDate(r.getDate() + 6); r.setHours(23, 59, 59); return r; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rangeStart = useMemo(() => {
    if (view === 'month') return startOfMonth(cursor);
    if (view === 'week')  return startOfWeek(cursor);
    return new Date(cursor.setHours(0, 0, 0, 0));
  }, [view, cursor]);

  const rangeEnd = useMemo(() => {
    if (view === 'month') return endOfMonth(cursor);
    if (view === 'week')  return endOfWeek(cursor);
    return new Date(cursor.setHours(23, 59, 59, 999));
  }, [view, cursor]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch a full month window so drag targets outside the visible week/day still resolve
      const data = await fetchCalendarEvents(startOfMonth(cursor), endOfMonth(cursor));
      setEvents(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [cursor]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  function eventsOnDay(day: Date) {
    return events.filter(e => sameDay(new Date(e.startTime), day));
  }

  function navigate(dir: -1 | 1) {
    const next = new Date(cursor);
    if (view === 'month') next.setMonth(cursor.getMonth() + dir);
    else if (view === 'week') next.setDate(cursor.getDate() + dir * 7);
    else next.setDate(cursor.getDate() + dir);
    setCursor(next);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const draggedEvent = active.data.current?.event as CalendarEvent | undefined;
    const targetDate    = over.data.current?.date as Date | undefined;
    if (!draggedEvent || !targetDate) return;

    const originalStart = new Date(draggedEvent.startTime);
    const originalEnd    = new Date(draggedEvent.endTime);
    const durationMs      = originalEnd.getTime() - originalStart.getTime();

    const newStart = new Date(targetDate);
    // In month view (day cells, not hour slots), preserve the original time of day
    if (view === 'month') {
      newStart.setHours(originalStart.getHours(), originalStart.getMinutes());
    }
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Optimistic UI update
    setEvents(prev => prev.map(ev => ev.id === draggedEvent.id
      ? { ...ev, startTime: newStart.toISOString(), endTime: newEnd.toISOString() }
      : ev
    ));

    try {
      if (draggedEvent.applicationId) {
        // Interview event — reschedule on the Application record
        const timeStr = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
        await rescheduleInterview(draggedEvent.applicationId, newStart.toISOString(), timeStr);
      } else {
        // Manual calendar event
        await rescheduleEvent(draggedEvent.id, newStart.toISOString(), newEnd.toISOString());
      }
    } catch (err) {
      console.error(err);
      loadEvents(); // rollback on failure
    }
  }

  async function handleDelete(id: string, isSystem?: boolean) {
    if (isSystem) return;
    if (!confirm('Delete this event?')) return;
    try { await deleteCalendarEvent(id); loadEvents(); } catch (e) { console.error(e); }
  }

  const today = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.startTime) >= today)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6);

  const headerLabel = view === 'month'
    ? cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${startOfWeek(cursor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek(cursor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : cursor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <PageHeader
        title="Recruitment Calendar"
        description="Schedule interviews, meetings, and hiring deadlines. Drag events to reschedule."
        actions={
          <button
            onClick={() => { setSelectedDate(new Date()); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        }
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{headerLabel}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => setCursor(new Date())} className="px-3 h-8 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                    Today
                  </button>
                  <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors
                      ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Views */}
            {loading ? (
              <div className="h-96 bg-gray-50 rounded-lg animate-pulse" />
            ) : view === 'month' ? (
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="bg-gray-50 text-center text-xs font-medium text-gray-400 py-2">{d}</div>
                ))}
                {monthGrid.map((day, i) => {
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const isToday = sameDay(day, today);
                  const dayEvents = eventsOnDay(day);

                  return (
                    <DroppableDay
                      key={i}
                      id={`slot-${day.toISOString()}`}
                      date={day}
                      className={`bg-white min-h-[92px] p-1.5 text-left transition-colors ${!inMonth ? 'opacity-40' : ''}`}
                    >
                      <button
                        onClick={() => { setSelectedDate(day); setShowModal(true); }}
                        className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full
                          ${isToday ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {day.getDate()}
                      </button>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map(ev => (
                          <DraggableEvent key={ev.id} event={ev} onClick={() => {}} />
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-[10px] text-gray-400 px-1.5">+{dayEvents.length - 2} more</p>
                        )}
                      </div>
                    </DroppableDay>
                  );
                })}
              </div>
            ) : view === 'week' ? (
              <WeekView
                weekStart={startOfWeek(cursor)}
                events={events}
                onEventClick={() => {}}
                onSlotClick={(d) => { setSelectedDate(d); setShowModal(true); }}
              />
            ) : (
              <DayView
                date={cursor}
                events={events}
                onEventClick={() => {}}
                onSlotClick={(d) => { setSelectedDate(d); setShowModal(true); }}
              />
            )}
          </div>

          {/* Upcoming sidebar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
            <h3 className="font-semibold text-gray-900 mb-1">Upcoming Events</h3>
            <p className="text-xs text-gray-400 mb-4">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className={`rounded-lg border p-3 ${COLOR_MAP[ev.color ?? 'indigo']}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{ev.title}</p>
                      {!ev.isSystemGenerated && (
                        <button onClick={() => handleDelete(ev.id, ev.isSystemGenerated)} className="opacity-50 hover:opacity-100 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs opacity-75 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.startTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {ev.location && (
                      <p className="text-xs opacity-75 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {ev.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DndContext>

      {showModal && selectedDate && (
        <EventFormModal
          defaultDate={selectedDate}
          onClose={() => setShowModal(false)}
          onCreated={loadEvents}
        />
      )}
    </div>
  );
}
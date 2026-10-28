'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2 } from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import EventFormModal from '@/components/enterprise/EventFormModal';
import DraggableEvent from '@/components/enterprise/calendar/DraggableEvent';
import DroppableDay from '@/components/enterprise/calendar/DroppableDay';
import WeekView from '@/components/enterprise/calendar/WeekView';
import DayView from '@/components/enterprise/calendar/DayView';
import { Button } from '@/components/ui/button';
import {
  fetchCalendarEvents, deleteCalendarEvent, rescheduleEvent, rescheduleInterview,
  CalendarEvent,
} from '@/lib/calendar';

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  amber:  'bg-amber-50 text-amber-800 border-amber-200',
  red:    'bg-rose-50 text-rose-700 border-rose-200',
  green:  'bg-emerald-50 text-emerald-800 border-emerald-200',
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

  // Footer eka hide kirima me page ekedi
  useEffect(() => {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
      footerElement.style.display = 'none';
    }
    return () => {
      if (footerElement) {
        footerElement.style.display = '';
      }
    };
  }, []);

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
    const durationMs     = originalEnd.getTime() - originalStart.getTime();

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
    <div className="space-y-8 pb-12 font-sans text-slate-800">
      
      {/* Enterprise Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Recruitment Calendar"
          description="Schedule interviews, meetings, and hiring deadlines. Drag events to reschedule."
          actions={
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => { setSelectedDate(new Date()); setShowModal(true); }}
                variant="gradient"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-full shadow-md cursor-pointer h-10"
              >
                <Plus className="w-4 h-4" /> New Event
              </Button>
            </motion.div>
          }
        />
      </motion.div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Calendar View Container (8 Columns) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-8 bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-6"
          >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-sky-100">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">{headerLabel}</h3>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-sky-100">
                  <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-sky-100 hover:bg-white text-slate-600 transition-colors shadow-xs cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCursor(new Date())} className="px-3 h-8 text-xs font-bold rounded-xl border border-sky-100 hover:bg-white text-slate-700 transition-colors shadow-xs cursor-pointer">
                    Today
                  </button>
                  <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-sky-100 hover:bg-white text-slate-600 transition-colors shadow-xs cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex bg-slate-100/80 rounded-2xl p-1 border border-sky-100/60 shadow-xs">
                {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                      view === v ? 'bg-white text-[#0025B8] shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Views */}
            {loading ? (
              <div className="h-96 bg-sky-50/60 rounded-2xl animate-pulse" />
            ) : view === 'month' ? (
              <div className="grid grid-cols-7 gap-1.5 bg-sky-50/40 rounded-2xl p-2 border border-sky-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>
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
                      className={`bg-white min-h-[100px] p-2 text-left rounded-2xl border border-sky-100/60 transition-all shadow-xs hover:border-sky-200 ${!inMonth ? 'opacity-40 bg-slate-50/50' : ''}`}
                    >
                      <button
                        onClick={() => { setSelectedDate(day); setShowModal(true); }}
                        className={`text-xs inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold transition-all cursor-pointer ${
                          isToday ? 'bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white shadow-sm' : 'text-slate-700 hover:bg-sky-50'
                        }`}
                      >
                        {day.getDate()}
                      </button>
                      <div className="mt-1.5 space-y-1">
                        {dayEvents.slice(0, 2).map(ev => (
                          <DraggableEvent key={ev.id} event={ev} onClick={() => {}} />
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-[10px] font-bold text-[#0F9DE4] px-1">+{dayEvents.length - 2} more</p>
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
          </motion.div>

          {/* Upcoming Sidebar (4 Columns) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-4 bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-6 h-fit sticky top-28"
          >
            <div className="border-b border-sky-100 pb-4 space-y-0.5">
              <h3 className="font-bold text-slate-900 text-base tracking-tight">Upcoming Events</h3>
              <p className="text-xs text-slate-400 font-medium">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-sky-50/60 rounded-2xl" />)}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-6">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-3.5">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className={`rounded-2xl border p-4 shadow-xs ${COLOR_MAP[ev.color ?? 'indigo']}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold tracking-tight">{ev.title}</p>
                      {!ev.isSystemGenerated && (
                        <button onClick={() => handleDelete(ev.id, ev.isSystemGenerated)} className="opacity-60 hover:opacity-100 flex-shrink-0 cursor-pointer p-1 rounded-lg hover:bg-black/5 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs opacity-80 font-medium flex items-center gap-1.5 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ev.startTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {ev.location && (
                      <p className="text-xs opacity-80 font-medium flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" /> {ev.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

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
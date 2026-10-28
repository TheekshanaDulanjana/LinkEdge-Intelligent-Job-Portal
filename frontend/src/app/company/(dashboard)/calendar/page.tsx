'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2, CalendarDays, CalendarCheck, Info } from 'lucide-react';
import EventFormModal from '@/components/enterprise/EventFormModal';
import DraggableEvent from '@/components/enterprise/calendar/DraggableEvent';
import DroppableDay from '@/components/enterprise/calendar/DroppableDay';
import WeekView from '@/components/enterprise/calendar/WeekView';
import DayView from '@/components/enterprise/calendar/DayView';
import { EVENT_STYLE, styleFor } from '@/components/enterprise/calendar/eventStyle';
import {
  fetchCalendarEvents, deleteCalendarEvent, rescheduleEvent, rescheduleInterview, CalendarEvent,
} from '@/lib/calendar';
import { Panel, KpiTile, EmptyNote, PanelSkeleton, Pill, cx } from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, Segmented, Modal, ConfirmDialog, Toast, useHideFooter, btnPrimary, btnSecondary, iconBtn,
} from '@/components/enterprise/dashboard/kit';

type ViewMode = 'month' | 'week' | 'day';

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(d.getDate() - d.getDay()); r.setHours(0, 0, 0, 0); return r; }
function endOfWeek(d: Date) { const r = startOfWeek(d); r.setDate(r.getDate() + 6); r.setHours(23, 59, 59); return r; }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function CalendarPage() {
  useHideFooter();

  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const today = new Date();

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Always load a full month so drag targets outside the visible week or day still resolve.
      // Week views that straddle two months also need the neighbouring month.
      const from = view === 'week' ? new Date(Math.min(startOfMonth(cursor).getTime(), startOfWeek(cursor).getTime())) : startOfMonth(cursor);
      const to = view === 'week' ? new Date(Math.max(endOfMonth(cursor).getTime(), endOfWeek(cursor).getTime())) : endOfMonth(cursor);
      setEvents(await fetchCalendarEvents(from, to));
    } catch (e) { console.error(e); flash('err', 'Could not load events.'); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, view, view === 'week' ? startOfWeek(cursor).getTime() : 0]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const visible = useMemo(() => events.filter(e => !hidden[e.eventType]), [events, hidden]);

  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d; });
  }, [cursor]);

  const eventsOn = (day: Date) => visible.filter(e => sameDay(new Date(e.startTime), day)).sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));

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
    const dragged = active.data.current?.event as CalendarEvent | undefined;
    const target = over.data.current?.date as Date | undefined;
    if (!dragged || !target) return;

    const s0 = new Date(dragged.startTime);
    const dur = new Date(dragged.endTime).getTime() - s0.getTime();
    const newStart = new Date(target);
    if (view === 'month') newStart.setHours(s0.getHours(), s0.getMinutes());
    const newEnd = new Date(newStart.getTime() + dur);
    if (newStart.getTime() === s0.getTime()) return;

    setEvents(prev => prev.map(ev => (ev.id === dragged.id ? { ...ev, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : ev)));
    try {
      if (dragged.applicationId) {
        const t = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
        await rescheduleInterview(dragged.applicationId, newStart.toISOString(), t);
      } else {
        await rescheduleEvent(dragged.id, newStart.toISOString(), newEnd.toISOString());
      }
      flash('ok', 'Rescheduled.');
    } catch (err) { console.error(err); flash('err', 'Could not reschedule. Restored the original time.'); loadEvents(); }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try { await deleteCalendarEvent(toDelete.id); setToDelete(null); setDetail(null); loadEvents(); flash('ok', 'Event deleted.'); }
    catch (e) { console.error(e); flash('err', 'Could not delete the event.'); }
  }

  const upcoming = useMemo(() => visible
    .filter(e => new Date(e.endTime) >= today)
    .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
    .slice(0, 8),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [visible]);

  const todays = events.filter(e => sameDay(new Date(e.startTime), today));
  const weekEnd = endOfWeek(today);
  const thisWeek = events.filter(e => { const s = new Date(e.startTime); return s >= startOfWeek(today) && s <= weekEnd; });
  const interviewsMonth = events.filter(e => e.eventType === 'INTERVIEW').length;
  const deadlines = events.filter(e => e.eventType === 'DEADLINE' && new Date(e.startTime) >= today).length;

  const headerLabel = view === 'month'
    ? cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${startOfWeek(cursor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek(cursor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : cursor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        eyebrow="Schedule"
        title="Calendar"
        description="Interviews, meetings and hiring deadlines in one view. Drag an event to a new day or time to reschedule it."
        actions={<button onClick={() => { setSelectedDate(new Date()); setShowModal(true); }} className={btnPrimary}><Plus className="w-3.5 h-3.5" /> New event</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Today" icon={<CalendarCheck className="w-3.5 h-3.5" />} loading={loading} value={todays.length} hint={todays.length ? `Next ${timeOf(todays.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))[0].startTime)}` : 'Nothing scheduled'} />
        <KpiTile label="This week" icon={<CalendarDays className="w-3.5 h-3.5" />} loading={loading} value={thisWeek.length} hint="All event types" />
        <KpiTile label="Interviews this month" icon={<Clock className="w-3.5 h-3.5" />} loading={loading} value={interviewsMonth} hint={cursor.toLocaleDateString('en-US', { month: 'long' })} />
        <KpiTile label="Upcoming deadlines" icon={<Info className="w-3.5 h-3.5" />} loading={loading} value={deadlines} hint="This month" />
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <Panel className="xl:col-span-9" title={headerLabel} subtitle={loading ? 'Loading…' : `${visible.length} event${visible.length === 1 ? '' : 's'} in range`} icon={<CalendarDays className="w-3.5 h-3.5" />} noPad
            actions={<>
              <div className="flex items-center gap-1">
                <button onClick={() => navigate(-1)} className={cx(iconBtn, 'border border-slate-200')} aria-label="Previous"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCursor(new Date())} className={cx(btnSecondary, '!h-8 !px-3')}>Today</button>
                <button onClick={() => navigate(1)} className={cx(iconBtn, 'border border-slate-200')} aria-label="Next"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }]} />
            </>}>
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 flex-wrap">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Show</span>
              {Object.entries(EVENT_STYLE).map(([k, s]) => (
                <label key={k} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={!hidden[k]} onChange={() => setHidden(h => ({ ...h, [k]: !h[k] }))} className="accent-[#0025B8]" />
                  <span className={cx('w-2 h-2 rounded-full', s.dot)} />{s.label}
                </label>
              ))}
            </div>

            {loading ? <div className="p-5"><PanelSkeleton rows={9} /></div>
              : view === 'month' ? (
                <div>
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 py-2">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthGrid.map((day, i) => {
                      const inMonth = day.getMonth() === cursor.getMonth();
                      const isToday = sameDay(day, today);
                      const list = eventsOn(day);
                      return (
                        <DroppableDay key={i} id={`slot-${day.toISOString()}`} date={day}
                          className={cx('min-h-[112px] p-1.5 border-b border-l border-slate-100 text-left transition-colors', !inMonth && 'bg-slate-50/60', i % 7 === 0 && 'border-l-0')}>
                          <button onClick={() => { setSelectedDate(day); setShowModal(true); }}
                            className={cx('text-[11px] inline-flex items-center justify-center w-6 h-6 rounded-full font-semibold cursor-pointer transition-colors',
                              isToday ? 'bg-[#0025B8] text-white' : inMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-100')}>
                            {day.getDate()}
                          </button>
                          <div className="mt-1 space-y-0.5">
                            {list.slice(0, 3).map(ev => <DraggableEvent key={ev.id} event={ev} onClick={() => setDetail(ev)} />)}
                            {list.length > 3 && <button onClick={() => { setCursor(day); setView('day'); }} className="text-[10px] font-semibold text-[#0025B8] px-1 hover:underline cursor-pointer">+{list.length - 3} more</button>}
                          </div>
                        </DroppableDay>
                      );
                    })}
                  </div>
                </div>
              ) : view === 'week' ? (
                <WeekView weekStart={startOfWeek(cursor)} events={visible} onEventClick={setDetail} onSlotClick={d => { setSelectedDate(d); setShowModal(true); }} />
              ) : (
                <DayView date={cursor} events={visible} onEventClick={setDetail} onSlotClick={d => { setSelectedDate(d); setShowModal(true); }} />
              )}
          </Panel>

          <div className="xl:col-span-3 space-y-4 xl:sticky xl:top-24">
            <Panel title="Upcoming" subtitle={today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} icon={<Clock className="w-3.5 h-3.5" />} noPad>
              {loading ? <div className="p-5"><PanelSkeleton rows={4} /></div> : upcoming.length === 0 ? <EmptyNote text="Nothing coming up in this range." icon={<CalendarDays className="w-6 h-6" />} /> : (
                <ul className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {upcoming.map(ev => {
                    const s = styleFor(ev);
                    return (
                      <li key={ev.id}>
                        <button onClick={() => setDetail(ev)} className={cx('w-full text-left px-5 py-3 border-l-[3px] hover:bg-slate-50 transition-colors cursor-pointer', s.bar)}>
                          <p className="text-[13px] font-semibold text-slate-900 truncate">{ev.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5"><Clock className="w-3 h-3" />{new Date(ev.startTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          {ev.location && <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3" />{ev.location}</p>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </DndContext>

      {showModal && selectedDate && <EventFormModal defaultDate={selectedDate} onClose={() => setShowModal(false)} onCreated={() => { loadEvents(); flash('ok', 'Event created.'); }} />}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''} subtitle={detail ? styleFor(detail).label : undefined}
        footer={detail && <>
          {!detail.isSystemGenerated && <button onClick={() => setToDelete(detail)} className={cx(btnSecondary, 'text-rose-600 hover:!bg-rose-50')}><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
          <button onClick={() => setDetail(null)} className={btnSecondary}>Close</button>
        </>}>
        {detail && (
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center gap-2"><Pill tone={detail.eventType === 'DEADLINE' ? 'rose' : detail.eventType === 'REMINDER' ? 'green' : detail.eventType === 'INTERVIEW' ? 'sky' : 'blue'}>{styleFor(detail).label}</Pill>{detail.isSystemGenerated && <Pill tone="slate">Auto-created</Pill>}</div>
            <p className="flex items-center gap-2 text-slate-700"><Clock className="w-4 h-4 text-slate-400" />{new Date(detail.startTime).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, {timeOf(detail.startTime)} – {timeOf(detail.endTime)}</p>
            {detail.location && <p className="flex items-center gap-2 text-slate-700"><MapPin className="w-4 h-4 text-slate-400" />{detail.location}</p>}
            {detail.description && <p className="text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-3">{detail.description}</p>}
            {detail.applicationId && <p className="text-xs text-slate-400">Linked to an application. Drag it on the calendar to change the interview time.</p>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} title="Delete this event?" confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setToDelete(null)} message="It will be removed from your calendar." />
      <Toast toast={toast} />
    </div>
  );
}

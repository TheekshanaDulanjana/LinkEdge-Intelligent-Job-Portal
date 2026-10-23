import { applicationApi } from '@/lib/api';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  eventType: 'INTERVIEW' | 'MEETING' | 'DEADLINE' | 'REMINDER';
  startTime: string;
  endTime: string;
  location?: string | null;
  color?: string | null;
  applicationId?: string | null;
  isSystemGenerated?: boolean;
}

export async function fetchCalendarEvents(from: Date, to: Date) {
  const res = await applicationApi.get('/applications/company/calendar/events', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return res.data.data as CalendarEvent[];
}

export async function createCalendarEvent(payload: {
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
}) {
  const res = await applicationApi.post('/applications/company/calendar/events', payload);
  return res.data.data as CalendarEvent;
}

export async function rescheduleEvent(id: string, startTime: string, endTime: string) {
  const res = await applicationApi.patch(`/applications/company/calendar/events/${id}`, {
    startTime,
    endTime,
  });
  return res.data.data as CalendarEvent;
}

export async function deleteCalendarEvent(id: string) {
  return applicationApi.delete(`/applications/company/calendar/events/${id}`);
}

export async function rescheduleInterview(
  applicationId: string,
  interviewDate: string,
  interviewTime: string
) {
  const res = await applicationApi.patch(
    `/applications/company/calendar/interview/${applicationId}/reschedule`,
    { interviewDate, interviewTime }
  );
  return res.data.data;
}
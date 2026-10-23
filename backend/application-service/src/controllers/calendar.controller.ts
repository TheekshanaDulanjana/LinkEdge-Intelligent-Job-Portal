import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCompanyId(req: any): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where: { userId: req.user.userId },
    select: { id: true },
  });
  return company?.id ?? null;
}

// ── GET /api/v1/applications/company/calendar/events?from=&to= ─────────────────
// Merges: manually created CalendarEvent rows + auto-synced interviews from Application
export async function getCalendarEvents(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const { from, to } = req.query;
    const dateFrom = from ? new Date(from as string) : new Date(new Date().setDate(1));
    const dateTo = to
      ? new Date(to as string)
      : new Date(new Date(dateFrom).setMonth(dateFrom.getMonth() + 1));

    // 1. Manually created events
    const manualEvents = await prisma.calendarEvent.findMany({
      where: { companyId, startTime: { gte: dateFrom, lte: dateTo } },
      orderBy: { startTime: 'asc' },
    });

    // 2. Auto-synced interview events from Application table
    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map((j) => j.id);

    const interviews = await prisma.application.findMany({
      where: {
        jobId: { in: jobIds },
        status: 'INTERVIEW',
        interviewDate: { gte: dateFrom, lte: dateTo, not: null },
      },
      select: {
        id: true,
        interviewDate: true,
        interviewTime: true,
        interviewVenue: true,
        seekerId: true,
        job: { select: { title: true } },
      },
    });

    const interviewEvents = interviews.map((a) => {
      const start = new Date(a.interviewDate!);
      if (a.interviewTime) {
        const [h, m] = a.interviewTime.split(':').map(Number);
        start.setHours(h ?? 9, m ?? 0);
      }
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1hr default duration

      return {
        id: `interview-${a.id}`,
        title: `Interview: ${a.job.title}`,
        description: `Candidate interview for ${a.job.title}`,
        eventType: 'INTERVIEW' as const,
        startTime: start,
        endTime: end,
        location: a.interviewVenue,
        color: 'amber',
        applicationId: a.id,
        seekerId: a.seekerId,
        isSystemGenerated: true,
      };
    });

    const combined = [
      ...manualEvents.map((e) => ({ ...e, isSystemGenerated: false })),
      ...interviewEvents,
    ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    res.json({ success: true, data: combined });
  } catch (e) {
    console.error('[calendar-events]', e);
    res.status(500).json({ success: false, message: 'Failed to load calendar events' });
  }
}

// ── POST /api/v1/applications/company/calendar/events ─────────────────────────
export async function createCalendarEvent(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const { title, description, eventType, startTime, endTime, location, color } = req.body;

    if (!title || !startTime || !endTime) {
      res.status(400).json({ success: false, message: 'Title, startTime, and endTime are required' });
      return;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        companyId,
        title,
        description,
        eventType: eventType ?? 'MEETING',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        color: color ?? 'indigo',
      },
    });

    res.status(201).json({ success: true, data: event });
  } catch (e) {
    console.error('[create-event]', e);
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
}

// ── PATCH /api/v1/applications/company/calendar/events/:id ────────────────────
// Handles both field updates AND drag-and-drop reschedule (startTime/endTime only)
export async function updateCalendarEvent(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      res.status(403).json({ success: false, message: 'Not authorized for this event' });
      return;
    }

    const { title, description, eventType, startTime, endTime, location, color } = req.body;

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(eventType !== undefined && { eventType }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(location !== undefined && { location }),
        ...(color !== undefined && { color }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[update-event]', e);
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
}

// ── DELETE /api/v1/applications/company/calendar/events/:id ───────────────────
export async function deleteCalendarEvent(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      res.status(403).json({ success: false, message: 'Not authorized for this event' });
      return;
    }

    await prisma.calendarEvent.delete({ where: { id } });
    res.json({ success: true, message: 'Event deleted' });
  } catch (e) {
    console.error('[delete-event]', e);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
}

// ── PATCH /api/v1/applications/company/calendar/interview/:applicationId/reschedule ──
// Reschedules the interview stored on the Application record (drag-drop from calendar)
export async function rescheduleInterview(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    const { applicationId } = req.params;
    const { interviewDate, interviewTime } = req.body;

    if (!interviewDate) {
      res.status(400).json({ success: false, message: 'interviewDate is required' });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application || application.job.companyId !== companyId) {
      res.status(403).json({ success: false, message: 'Not authorized for this interview' });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        interviewDate: new Date(interviewDate),
        ...(interviewTime && { interviewTime }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[reschedule-interview]', e);
    res.status(500).json({ success: false, message: 'Failed to reschedule interview' });
  }
}
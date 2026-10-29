import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import { validateBody, validateParams, calendarCreateSchema, calendarUpdateSchema, rescheduleSchema } from '../lib/validation';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  rescheduleInterview,
} from '../controllers/calendar.controller';

const router = Router();

router.get('/company/calendar/events', authenticate, requireCompany, getCalendarEvents);
router.post('/company/calendar/events', authenticate, requireCompany, validateBody(calendarCreateSchema), createCalendarEvent);
router.patch('/company/calendar/events/:id', authenticate, requireCompany, validateParams('id'), validateBody(calendarUpdateSchema), updateCalendarEvent);
router.delete('/company/calendar/events/:id', authenticate, requireCompany, validateParams('id'), deleteCalendarEvent);

router.patch(
  '/company/calendar/interview/:applicationId/reschedule',
  authenticate,
  requireCompany,
  validateParams('applicationId'),
  validateBody(rescheduleSchema),
  rescheduleInterview
);

export default router;
import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  rescheduleInterview,
} from '../controllers/calendar.controller';

const router = Router();

router.get('/company/calendar/events', authenticate, requireCompany, getCalendarEvents);
router.post('/company/calendar/events', authenticate, requireCompany, createCalendarEvent);
router.patch('/company/calendar/events/:id', authenticate, requireCompany, updateCalendarEvent);
router.delete('/company/calendar/events/:id', authenticate, requireCompany, deleteCalendarEvent);

router.patch(
  '/company/calendar/interview/:applicationId/reschedule',
  authenticate,
  requireCompany,
  rescheduleInterview
);

export default router;
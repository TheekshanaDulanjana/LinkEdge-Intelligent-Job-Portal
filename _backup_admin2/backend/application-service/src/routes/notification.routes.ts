import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

/**
 * Notifications are scoped twice:
 *  1. by receiver (the logged-in user's id), and
 *  2. by the kinds of events that make sense for that user's role.
 * A seeker never sees company events and a company never sees seeker events,
 * even if a row was created for the wrong audience by mistake.
 */
const SEEKER_TYPES = ['APPLICATION_SHORTLISTED', 'INTERVIEW_SCHEDULED', 'APPLICATION_REJECTED', 'STATUS_UPDATE', 'SYSTEM'];
const COMPANY_TYPES = ['NEW_APPLICATION', 'STATUS_UPDATE', 'SYSTEM'];

function scope(req: any) {
  const role = String(req.user?.role ?? '').toUpperCase();
  const types = role === 'COMPANY' ? COMPANY_TYPES : SEEKER_TYPES;
  return { receiverId: req.user.userId, type: { in: types as any } };
}

// Get notifications for the logged-in user
router.get('/', authenticate, async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: scope(req),
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (e) {
    console.error('[notifications:list]', e);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

// Unread count only (for the bell badge)
router.get('/unread-count', authenticate, async (req: any, res) => {
  try {
    const count = await prisma.notification.count({ where: { ...scope(req), isRead: false } });
    res.json({ success: true, data: { count } });
  } catch (e) {
    console.error('[notifications:count]', e);
    res.status(500).json({ success: false, message: 'Failed to load unread count' });
  }
});

// Mark all as read (declared before "/:id/read" so the paths never collide)
router.patch('/mark-all-read', authenticate, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: { ...scope(req), isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[notifications:mark-all]', e);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// Mark one as read
router.patch('/:id/read', authenticate, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, receiverId: req.user.userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[notifications:read]', e);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

export default router;

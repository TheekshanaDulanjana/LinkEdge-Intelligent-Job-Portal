import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

// Get all notifications for the logged-in user
router.get('/', authenticate, async (req: any, res) => {
  const notifications = await prisma.notification.findMany({
    where: { receiverId: req.user.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: notifications });
});

// Get unread count only (for the bell badge)
router.get('/unread-count', authenticate, async (req: any, res) => {
  const count = await prisma.notification.count({
    where: { receiverId: req.user.id, isRead: false }
  });
  res.json({ success: true, data: { count } });
});

// Mark one as read
router.patch('/:id/read', authenticate, async (req: any, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, receiverId: req.user.userId },
    data: { isRead: true },
  });
  res.json({ success: true });
});

// Mark all as read
router.patch('/mark-all-read', authenticate, async (req: any, res) => {
  await prisma.notification.updateMany({
    where: { receiverId: req.user.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

export default router;
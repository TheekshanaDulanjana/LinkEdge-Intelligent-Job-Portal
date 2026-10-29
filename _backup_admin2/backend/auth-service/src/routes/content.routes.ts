import { Router } from 'express';
import { loadPublicContent } from '../admin/content';

const router = Router();

/** Public, read-only landing-page content. Cached briefly so traffic spikes never reach the database. */
router.get('/', async (_req, res, next) => {
  try {
    const content = await loadPublicContent();
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({ success: true, data: content });
  } catch (e) { next(e); }
});

export default router;

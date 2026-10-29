import axios from 'axios';
import { createLogger } from '../../../shared/logger/logger';

const logger = createLogger('auth-service');
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';
export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

export interface AdminNotice {
  to: string;
  name: string;
  heading: string;
  message: string;
  reason?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}

/** Send an administrator notice by email. Returns false (and logs) instead of throwing. */
export async function sendAdminNotice(n: AdminNotice): Promise<boolean> {
  try {
    await axios.post(`${NOTIFICATION_URL}/send/admin-notice`, { reason: '', ...n }, {
      headers: { 'x-service-key': SERVICE_KEY },
      timeout: 10000,
    });
    return true;
  } catch (e) {
    logger.error('Admin notice email failed', { error: String(e) });
    return false;
  }
}

/**
 * Turns an image link stored in the database into something the browser can load.
 * New uploads are saved as full URLs. Older rows may still hold "/uploads/..." paths,
 * which belong to the auth service, not to the frontend's own origin.
 */
import { serviceUrl, isProxyMode } from './serviceUrl';

const assetBase = () =>
  (process.env.NEXT_PUBLIC_ASSET_BASE_URL ||
    serviceUrl(process.env.NEXT_PUBLIC_AUTH_SERVICE_URL, 3001).replace(/\/api\/v\d+\/?$/, '')).replace(/\/+$/, '');

export function assetUrl(url?: string | null): string {
  if (!url) return '';
  // Live demo mode: the tunnel address changes every time, so serve stored /uploads/ links through the current one.
  if (isProxyMode()) {
    const m = url.match(/^(?:https?:\/\/[^/]+)?(\/uploads\/.*)$/i);
    if (m) return `${assetBase()}${m[1]}`;
  }
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${assetBase()}${url.startsWith('/') ? '' : '/'}${url}`;
}

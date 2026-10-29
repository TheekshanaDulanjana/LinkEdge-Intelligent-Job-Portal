/**
 * Turns an image link stored in the database into something the browser can load.
 * New uploads are saved as full URLs. Older rows may still hold "/uploads/..." paths,
 * which belong to the auth service, not to the frontend's own origin.
 */
const AUTH_API = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001/api/v1';
const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL || AUTH_API.replace(/\/api\/v\d+\/?$/, '')).replace(/\/+$/, '');

export function assetUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${ASSET_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Address of a back-end service as seen from the browser.
 * An explicit NEXT_PUBLIC_*_URL wins. Otherwise the page's own host name is used, so the same build works on
 * http://localhost:3000 and on http://192.168.x.x:3000 (phone or tablet on the same Wi-Fi).
 *
 * Live demo mode (deploy/ folder): when the site is opened through a Cloudflare quick tunnel
 * (*.trycloudflare.com) or the Caddy proxy on port 8080, every service is reached through the same
 * address as  <origin>/p/<port>/api/v1  and the proxy forwards it. Normal local use is unchanged.
 */
export function isProxyMode(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, port } = window.location;
  return hostname.endsWith('.trycloudflare.com') || port === '8080';
}

export function serviceUrl(explicit: string | undefined, port: number, prefix = '/api/v1'): string {
  if (explicit) return explicit;
  if (typeof window !== 'undefined') {
    if (isProxyMode()) return `${window.location.origin}/p/${port}${prefix}`;
    return `${window.location.protocol}//${window.location.hostname}:${port}${prefix}`;
  }
  return `http://localhost:${port}${prefix}`;
}

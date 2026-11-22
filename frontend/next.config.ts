import type { NextConfig } from "next";

// Safe, non-breaking security headers. (A full script-src CSP is not added because Firebase sign-in
// pops up Google pages and Next.js uses inline scripts; frame, object and base rules are enforced.)
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Images uploaded to Cloudflare R2 (public bucket URL) can be shown with next/image.
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.r2.dev' }] },
  // Dev only: lets phones/tablets on the same Wi-Fi open the site (hot reload works).
  // Add more devices with DEV_ALLOWED_ORIGINS="192.168.8.20,192.168.8.31" in .env.local.
  allowedDevOrigins: ["192.168.8.150", ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [])],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images uploaded to Cloudflare R2 (public bucket URL) can be shown with next/image.
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.r2.dev' }] },
  // Dev only: lets phones/tablets on the same Wi-Fi open the site (hot reload works).
  // Add more devices with DEV_ALLOWED_ORIGINS="192.168.8.20,192.168.8.31" in .env.local.
  allowedDevOrigins: ["192.168.8.150", ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [])],
};

export default nextConfig;

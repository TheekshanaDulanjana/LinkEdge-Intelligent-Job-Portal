import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Image storage for profile photos, company logos and cover images.
 *
 * What goes in the database is always a full, permanent URL. Files get a random,
 * never-reused name, so a URL never changes meaning and can be cached for a year.
 *
 * Drivers (STORAGE_DRIVER):
 *   local  (default) files in ./uploads, served by this service at PUBLIC_BASE_URL/uploads
 *   s3     any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase, MinIO, DigitalOcean Spaces)
 *
 * s3 needs:  npm i @aws-sdk/client-s3
 *            S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *            S3_PUBLIC_URL (public bucket or CDN base URL, no trailing slash),
 *            S3_ENDPOINT (only for non-AWS providers like R2 / MinIO)
 */

const DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

export const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`
).replace(/\/+$/, '');

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageFolder = 'profiles' | 'logos' | 'covers';

/** Identify the real image type from the first bytes, ignoring the file name and client MIME. */
export function sniffImage(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
    if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

let s3Client: any = null;
async function s3() {
  if (s3Client) return s3Client;
  const moduleName = '@aws-sdk/client-s3';
  let mod: any;
  try {
    mod = await import(moduleName);
  } catch {
    throw new Error('STORAGE_DRIVER=s3 needs the package: npm i @aws-sdk/client-s3');
  }
  s3Client = {
    mod,
    client: new mod.S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
      },
    }),
  };
  return s3Client;
}

/** Validate and store an uploaded image. Returns the permanent public URL. */
export async function saveImage(buffer: Buffer, folder: ImageFolder): Promise<string> {
  const kind = sniffImage(buffer);
  if (!kind) throw Object.assign(new Error('Only real JPG, PNG or WEBP images are accepted.'), { status: 400 });
  if (buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error('Image must be under 5 MB.'), { status: 400 });

  const key = `${folder}/${crypto.randomUUID()}.${kind.ext}`;

  if (DRIVER === 's3') {
    const { client, mod } = await s3();
    await client.send(new mod.PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: kind.mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    const base = (process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '');
    return `${base}/${key}`;
  }

  const full = path.join(UPLOAD_ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return `${PUBLIC_BASE_URL}/uploads/${key}`;
}

/** Remove a previously stored image. Never throws: a missing file is not an error. */
export async function deleteImage(url?: string | null): Promise<void> {
  if (!url) return;
  try {
    if (DRIVER === 's3') {
      const base = (process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '');
      if (!base || !url.startsWith(base + '/')) return;
      const { client, mod } = await s3();
      await client.send(new mod.DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: url.slice(base.length + 1) }));
      return;
    }
    const marker = '/uploads/';
    const i = url.indexOf(marker);
    if (i === -1) return;
    const rel = url.slice(i + marker.length).split('?')[0];
    const full = path.normalize(path.join(UPLOAD_ROOT, rel));
    if (!full.startsWith(UPLOAD_ROOT + path.sep)) return; // never leave the uploads folder
    await fs.unlink(full);
  } catch {
    /* already gone */
  }
}

/** One-time repair: turn old relative paths (/uploads/...) into full URLs. Safe to run on every start. */
export async function absolutizeStoredUrls(prisma: any): Promise<void> {
  if (DRIVER !== 'local') return;
  const fix = (v?: string | null) => (v && v.startsWith('/uploads/') ? `${PUBLIC_BASE_URL}${v}` : null);
  try {
    const seekers = await prisma.jobSeeker.findMany({ where: { profileImageUrl: { startsWith: '/uploads/' } }, select: { id: true, profileImageUrl: true } });
    for (const s of seekers) await prisma.jobSeeker.update({ where: { id: s.id }, data: { profileImageUrl: fix(s.profileImageUrl) } });
    const companies = await prisma.company.findMany({
      where: { OR: [{ logoUrl: { startsWith: '/uploads/' } }, { coverImageUrl: { startsWith: '/uploads/' } }] },
      select: { id: true, logoUrl: true, coverImageUrl: true },
    });
    for (const c of companies) {
      await prisma.company.update({
        where: { id: c.id },
        data: { logoUrl: fix(c.logoUrl) ?? c.logoUrl, coverImageUrl: fix(c.coverImageUrl) ?? c.coverImageUrl },
      });
    }
    if (seekers.length || companies.length) console.log(`[storage] converted ${seekers.length + companies.length} image link(s) to full URLs`);
  } catch (e: any) {
    console.warn('[storage] url repair skipped:', e.message);
  }
}

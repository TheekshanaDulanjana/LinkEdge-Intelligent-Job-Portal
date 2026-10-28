import path from 'path';
import fs from 'fs';

/** Where submitted CVs are stored (service-root/uploads). */
export const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const ATS_URL = process.env.ATS_SERVICE_URL || 'http://localhost:8003';

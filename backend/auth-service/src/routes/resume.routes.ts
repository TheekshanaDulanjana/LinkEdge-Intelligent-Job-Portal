import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';
import { uploadLimiter } from '../../../shared/security/rateLimiter';

const router = Router();
const prisma = new PrismaClient();
const ATS_URL = process.env.ATS_SERVICE_URL || 'http://localhost:8003';

// ── Inline JWT middleware ──────────────────────────────────────────────────
function auth(req: any, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function seekerOnly(req: any, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'SEEKER') {
    res.status(403).json({ success: false, message: 'Seeker access required' });
    return;
  }
  next();
}

// ── Multer storage ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'resumes');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file, cb) => {
    // Random, unguessable name; extension is whitelisted by fileFilter below.
    cb(null, `resume-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word (.doc/.docx), and TXT files are supported'));
    }
  },
});

// ── POST /api/v1/auth/resume/upload ─────────────────────────────────────────
router.post(
  '/upload',
  auth,
  seekerOnly,
  uploadLimiter,
  upload.single('resume'),
  async (req: any, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Resume file is required' });
        return;
      }

      // Check the real content, not just the extension.
      const fd = fs.openSync(req.file.path, 'r');
      const head = Buffer.alloc(8);
      const read = fs.readSync(fd, head, 0, 8, 0);
      fs.closeSync(fd);
      const ext = path.extname(req.file.originalname).toLowerCase();
      const okPdf = ext === '.pdf' && head.slice(0, 5).toString('latin1') === '%PDF-';
      const okDocx = ext === '.docx' && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
      const okDoc = ext === '.doc' && head.slice(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
      const okTxt = ext === '.txt' && read > 0 && !head.slice(0, read).includes(0);
      if (!okPdf && !okDocx && !okDoc && !okTxt) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
        res.status(400).json({ success: false, message: 'The file content does not match its type. Upload a real PDF, Word or TXT file.' });
        return;
      }

      const { userId } = req.user;
      const filePath = req.file.path;

      // Remove old file from disk if replacing
      const existing = await prisma.candidateResume.findUnique({
        where: { candidateId: userId },
        select: { filePath: true },
      });
      if (existing?.filePath && existing.filePath !== filePath) {
        try { fs.unlinkSync(existing.filePath); } catch { /* already gone */ }
      }

      // Upsert — one resume per candidate, always
      const resume = await prisma.candidateResume.upsert({
        where: { candidateId: userId },
        create: {
          candidateId:  userId,
          filePath,
          originalName: req.file.originalname,
          fileSize:     req.file.size,
          mimeType:     req.file.mimetype,
          isParsed:     false,
        },
        update: {
          filePath,
          originalName:   req.file.originalname,
          fileSize:       req.file.size,
          mimeType:       req.file.mimetype,
          isParsed:       false,
          parseError:     null,
          skills:         [],
          certifications: [],
          technologies:   [],
          experienceYears: null,
          parsedText:     null,
          jobTitle:       null,
        },
      });

      // Fire-and-forget: parse via ATS service
      setImmediate(async () => {
        try {
          await axios.post(
            `${ATS_URL}/api/v1/ats/parse-resume`,
            {
              candidate_id: userId,
              resume_id:    resume.id,
              file_path:    path.resolve(filePath),
            },
            { timeout: 120_000 }
          );
        } catch (e: any) {
          console.warn('[resume] async parse failed:', e.message);
        }
      });

      res.status(201).json({
        success: true,
        message: 'Resume uploaded successfully. Parsing in progress…',
        data: {
          id:           resume.id,
          originalName: resume.originalName,
          fileSize:     resume.fileSize,
          mimeType:     resume.mimeType,
          uploadedDate: resume.uploadedDate,
          isParsed:     false,
          skillCount:   0,
        },
      });
    } catch (e: any) {
      console.error('[resume/upload]', e?.message ?? e);
      const msg =
        e?.message?.includes('Only PDF') ? e.message : 'Upload failed. Please try again.';
      res.status(400).json({ success: false, message: msg });
    }
  }
);

// ── GET /api/v1/auth/resume/me ───────────────────────────────────────────────
router.get('/me', auth, seekerOnly, async (req: any, res: Response) => {
  try {
    const resume = await prisma.candidateResume.findUnique({
      where: { candidateId: req.user.userId },
      select: {
        id:             true,
        originalName:   true,
        fileSize:       true,
        mimeType:       true,
        uploadedDate:   true,
        isParsed:       true,
        parseError:     true,
        skills:         true,
        certifications: true,
        experienceYears: true,
        jobTitle:       true,
        lastUpdated:    true,
      },
    });

    if (!resume) {
      res.json({ success: true, hasResume: false, data: null });
      return;
    }

    res.json({
      success:   true,
      hasResume: true,
      data: {
        ...resume,
        skillCount: resume.skills?.length ?? 0,
      },
    });
  } catch (e: any) {
    console.error('[resume/me GET]', e?.message ?? e);
    res.status(500).json({ success: false, message: 'Failed to retrieve resume' });
  }
});

// ── GET /api/v1/auth/resume/me/file ──────────────────────────────────────────
router.get('/me/file', auth, seekerOnly, async (req: any, res: Response) => {
  try {
    const resume = await prisma.candidateResume.findUnique({
      where: { candidateId: req.user.userId },
      select: { filePath: true, originalName: true, mimeType: true },
    });

    if (!resume || !resume.filePath) {
      res.status(404).json({ success: false, message: 'Resume file not found' });
      return;
    }

    const absolutePath = path.resolve(resume.filePath);

    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ success: false, message: 'File does not exist on server storage' });
      return;
    }

    res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.originalName}"`);

    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (e: any) {
    console.error('[resume/me/file GET]', e?.message ?? e);
    res.status(500).json({ success: false, message: 'Failed to retrieve resume file' });
  }
});

// ── DELETE /api/v1/auth/resume/me ────────────────────────────────────────────
router.delete('/me', auth, seekerOnly, async (req: any, res: Response) => {
  try {
    const resume = await prisma.candidateResume.findUnique({
      where:  { candidateId: req.user.userId },
      select: { id: true, filePath: true },
    });

    if (!resume) {
      res.status(404).json({ success: false, message: 'No resume found' });
      return;
    }

    if (resume.filePath) {
      try { fs.unlinkSync(resume.filePath); } catch { /* already gone */ }
    }

    await prisma.candidateResume.delete({ where: { candidateId: req.user.userId } });

    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (e: any) {
    console.error('[resume/me DELETE]', e?.message ?? e);
    res.status(500).json({ success: false, message: 'Failed to delete resume' });
  }
});

export default router;
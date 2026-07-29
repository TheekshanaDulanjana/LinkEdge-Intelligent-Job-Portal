import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();
const ATS_URL = process.env.ATS_SERVICE_URL || 'http://localhost:8003';

// ── Inline JWT middleware (auth-service owns the secret directly) ────────────
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
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${req.user.userId}-${uid}${path.extname(file.originalname)}`);
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
  upload.single('resume'),
  async (req: any, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Resume file is required' });
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
      // Multer file-filter errors come through here
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

    // Delete file from disk
    if (resume.filePath) {
      try { fs.unlinkSync(resume.filePath); } catch { /* already gone */ }
    }

    // Delete DB record — cascades to ATSScore automatically
    await prisma.candidateResume.delete({ where: { candidateId: req.user.userId } });

    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (e: any) {
    console.error('[resume/me DELETE]', e?.message ?? e);
    res.status(500).json({ success: false, message: 'Failed to delete resume' });
  }
});

export default router;
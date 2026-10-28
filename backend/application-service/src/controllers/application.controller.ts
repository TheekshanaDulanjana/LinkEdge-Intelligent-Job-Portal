import { Request, Response } from 'express';
import { applicationService } from '../services/application.service';
import { PrismaClient } from '@prisma/client';
import { notificationHelper } from '../services/notification.helper';
import pdfParse = require('pdf-parse');
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { screenApplication, overridePatch } from '../services/screening.service';
import { UPLOAD_DIR, ATS_URL } from '../config';
import { statusSchema } from '../lib/validation';
import { APPLICATION_LIST_SELECT } from '../lib/select';

const prisma = new PrismaClient();

const REJECTION_REASONS = [
  'Insufficient experience',
  'Missing required technical skills',
  'Qualification mismatch',
  'Overqualified for the role',
  'Cultural fit concerns',
  'Position filled internally',
  'Budget constraints',
];

/** Readable text of the submitted CV: ATS parser first (PDF/DOCX), pdf-parse as a fallback. */
async function extractCvText(filePath: string, mimetype: string): Promise<string> {
  try {
    const r = await axios.post(`${ATS_URL}/api/v1/ats/extract-text`, { file_path: filePath }, { timeout: 25000 });
    if (typeof r.data?.text === 'string' && r.data.text.trim().length > 0) return r.data.text.slice(0, 60000);
  } catch (e: any) {
    console.warn('[apply] ATS text extraction failed:', e.message);
  }
  try {
    if (mimetype === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      const pdfData = await (pdfParse as any)(fs.readFileSync(filePath));
      return String(pdfData.text || '').slice(0, 60000);
    }
  } catch (e: any) {
    console.warn('[apply] pdf-parse failed:', e.message);
  }
  return '';
}

function discard(filePath?: string) {
  if (filePath) fs.promises.unlink(filePath).catch(() => undefined);
}

export const applicationController = {

  async apply(req: any, res: Response) {
    const filePath: string | undefined = req.file?.path;
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'CV file is required' });
        return;
      }

      // Body is validated by the route (applySchema); jobId is a uuid here.
      const { jobId, coverLetter } = req.body;

      // Check the real content, not just the file extension.
      const head = Buffer.alloc(8);
      const fd = fs.openSync(req.file.path, 'r');
      fs.readSync(fd, head, 0, 8, 0);
      fs.closeSync(fd);
      const isPdf = head.slice(0, 5).toString('latin1') === '%PDF-';
      const isDocx = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
      const isDoc = head.slice(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
      if (!isPdf && !isDocx && !isDoc) {
        discard(filePath);
        res.status(400).json({ success: false, message: 'The file is not a valid PDF or Word document.' });
        return;
      }

      const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
      if (!job) { discard(filePath); res.status(404).json({ success: false, message: 'Job not found' }); return; }
      if (job.status !== 'ACTIVE') { discard(filePath); res.status(400).json({ success: false, message: 'This job is no longer accepting applications' }); return; }
      if (job.deadline.getTime() < Date.now()) { discard(filePath); res.status(400).json({ success: false, message: 'The application deadline has passed' }); return; }

      const seeker = await prisma.jobSeeker.findFirst({ where: { userId: req.user.userId }, include: { user: true } });
      if (!seeker) { discard(filePath); res.status(400).json({ success: false, message: 'Complete your profile before applying' }); return; }

      const existing = await prisma.application.findFirst({ where: { jobId, seekerId: req.user.userId } });
      if (existing) { discard(filePath); res.status(409).json({ success: false, message: 'You have already applied for this job' }); return; }

      const cvTextSnapshot = await extractCvText(req.file.path, req.file.mimetype);

      const created = await prisma.application.create({
        data: {
          jobId,
          seekerId: req.user.userId,
          cvUrl: `/uploads/${req.file.filename}`,
          coverLetter: coverLetter ?? null,
          status: 'PENDING',
          cvTextSnapshot,
        },
        select: { id: true, jobId: true, status: true, cvUrl: true, createdAt: true },
      });

      // Notify the company; a notification failure must never fail the application.
      try {
        const company = await prisma.company.findFirst({ where: { id: job.companyId }, include: { user: true } });
        if (company) {
          await notificationHelper.newApplicationReceived(
            company.userId, seeker.fullName, job.title, company.user.email, company.companyName, created.id, job.id
          );
        }
      } catch (n: any) {
        console.warn('[apply] company notification failed:', n.message);
      }

      // Score + auto-screen in the background. Errors leave the application PENDING for manual review.
      screenApplication(created.id).catch((e) => console.warn('[apply] screening failed:', e.message));

      res.status(201).json({ success: true, message: 'Application submitted.', data: created });
    } catch (error: any) {
      discard(filePath);
      console.error('[apply]', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async updateStatus(req: any, res: Response) {
    try {
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid status' });
        return;
      }
      const application = await prisma.application.findUnique({ where: { id: req.params.id }, include: { job: true } });
      if (!application) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
      const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
      if (!company || application.job.companyId !== company.id) {
        res.status(403).json({ success: false, message: 'Not authorized' });
        return;
      }
      const status = parsed.data.status;
      const patch = status === 'REJECTED' ? {} : overridePatch(application);
      const updated = await prisma.application.update({ where: { id: application.id }, data: { status, ...patch } });
      res.json({ success: true, message: 'Status updated successfully', data: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getRejectionReasons(req: Request, res: Response) {
    res.json({ success: true, data: REJECTION_REASONS });
  },

  async getMyApplications(req: any, res: Response) {
    try {
      const applications = await applicationService.getMyApplications(req.user.userId);
      res.json({ success: true, data: applications });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getJobApplications(req: any, res: Response) {
    try {
      const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
      const job = await prisma.jobPosting.findUnique({ where: { id: req.params.jobId } });
      if (!company || !job || job.companyId !== company.id) {
        res.status(403).json({ success: false, message: 'Not authorized for this job' });
        return;
      }

      const applications = await prisma.application.findMany({
        where: { jobId: job.id },
        select: { ...APPLICATION_LIST_SELECT, job: true },
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
        take: 1000,
      });

      const seekers = await prisma.jobSeeker.findMany({
        where: { userId: { in: applications.map((a) => a.seekerId) } },
        select: { userId: true, fullName: true },
      });
      const nameById = new Map(seekers.map((s) => [s.userId, s.fullName]));
      const enriched = applications.map((a) => ({ ...a, seekerName: nameById.get(a.seekerId) || 'Unknown' }));

      res.json({ success: true, data: enriched });
    } catch (e) {
      console.error('[getJobApplications]', e);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async downloadCv(req: any, res: Response) {
    try {
      const application = await prisma.application.findUnique({
        where: { id: req.params.id },
        include: { job: true },
      });
      if (!application) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      const company = await prisma.company.findFirst({
        where: { userId: req.user.userId },
      });
      if (!company || application.job.companyId !== company.id) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
      res.json({ success: true, data: { cvUrl: application.cvUrl } });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};
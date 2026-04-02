import { Request, Response } from 'express';
import { applicationService } from '../services/application.service';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

export const applicationController = {

  async apply(req: Request, res: Response) {
    try {
      // The CV file was uploaded by multer, it gives us the filename
      if (!req.file) {
        res.status(400).json({ success: false, message: 'CV file is required' });
        return;
      }

      // 1. Find the JobSeeker profile first
      const seeker = await prisma.jobSeeker.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!seeker) {
        res.status(404).json({ success: false, message: 'Job seeker profile not found. Please create your profile first.' });
        return;
      }

      const cvUrl = `/uploads/${req.file.filename}`;
      const { jobId, coverLetter } = req.body;

      // 2. Use seeker.id instead of req.user.userId
      const application = await applicationService.applyForJob(
        jobId,
        seeker.id, 
        cvUrl,
        coverLetter
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        const messages: Record<string, string> = {
          JOB_NOT_FOUND: 'Job not found',
          JOB_CLOSED: 'This job is no longer accepting applications',
          DEADLINE_PASSED: 'The application deadline has passed',
          ALREADY_APPLIED: 'You have already applied for this job',
        };
        if (messages[error.message]) {
          res.status(400).json({ success: false, message: messages[error.message] });
          return;
        }
      }
      console.error('Apply error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getMyApplications(req: Request, res: Response) {
    try {
      // Find the JobSeeker profile
      const seeker = await prisma.jobSeeker.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!seeker) {
        res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
        return;
      }

      // Use seeker.id
      const applications = await applicationService.getMyApplications(seeker.id);
      res.status(200).json({ success: true, data: applications });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getJobApplications(req: Request, res: Response) {
    try {
      // Find the Company profile
      const company = await prisma.company.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found.' });
        return;
      }

      // Use company.id
      const applications = await applicationService.getJobApplications(
        req.params.jobId as string,
        company.id
      );
      res.status(200).json({ success: true, data: applications });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      // Find the Company profile
      const company = await prisma.company.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found.' });
        return;
      }

      // Use company.id
      const application = await applicationService.updateStatus(
        req.params.id as string,
        req.body.status,
        company.id
      );
      res.status(200).json({ success: true, message: 'Status updated', data: application });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ success: false, message: 'Application not found' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ success: false, message: 'Access denied' });
          return;
        }
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};
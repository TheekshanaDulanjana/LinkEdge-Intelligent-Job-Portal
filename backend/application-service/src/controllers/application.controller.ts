import { Request, Response } from 'express';
import { applicationService } from '../services/application.service';
import { PrismaClient } from '@prisma/client';
import { notificationHelper } from '../services/notification.helper';

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

export const applicationController = {

  async apply(req: any, res: Response) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'CV file is required' });
        return;
      }
      const cvUrl = `/uploads/${req.file.filename}`;
      const { jobId, coverLetter } = req.body;
      const application = await applicationService.applyForJob(
        jobId, req.user.userId, cvUrl, coverLetter
      );

      // Trigger notifications
      const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
      const seeker = await prisma.jobSeeker.findFirst({
        where: { userId: req.user.userId },
        include: { user: true },
      });
      const company = await prisma.company.findFirst({
        where: { id: job?.companyId },
        include: { user: true },
      });

      if (job && seeker && company) {
        await notificationHelper.newApplicationReceived(
          company.userId,
          seeker.fullName,
          job.title,
          company.user.email,
          company.companyName,
          application.id,
          job.id
        );
      }

      res.status(201).json({ success: true, message: 'Application submitted.', data: application });
    } catch (error: any) {
      const msgs: Record<string, string> = {
        JOB_NOT_FOUND: 'Job not found',
        JOB_CLOSED: 'This job is no longer accepting applications',
        JOB_INACTIVE: 'This job is currently inactive',
        DEADLINE_PASSED: 'The application deadline has passed',
        ALREADY_APPLIED: 'You have already applied for this job',
      };
      if (msgs[error.message]) {
        res.status(400).json({ success: false, message: msgs[error.message] });
        return;
      }
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async scheduleInterview(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { date, time, venue } = req.body;

      if (!date || !time || !venue) {
        res.status(400).json({ success: false, message: 'Date, time and venue are required' });
        return;
      }

      const interviewDateTime = new Date(`${date}T${time}`);
      const practiceExpiresAt = new Date(interviewDateTime.getTime() - 60 * 60 * 1000);

      const application = await prisma.application.update({
        where: { id },
        data: {
          status: 'INTERVIEW',
          interviewDate: interviewDateTime,
          interviewTime: time,
          interviewVenue: venue,
          practiceExpiresAt,
        },
        include: { job: true },
      });

      const seeker = await prisma.jobSeeker.findFirst({
        where: { userId: application.seekerId },
        include: { user: true },
      });
      const company = await prisma.company.findFirst({
        where: { id: application.job.companyId },
        include: { user: true },
      });

      if (seeker && company) {
        await notificationHelper.interviewScheduled(
          application.seekerId,
          seeker.user.email,
          seeker.fullName,
          application.job.title,
          company.companyName,
          date,
          time,
          venue,
          application.id
        );
      }

      res.json({ success: true, message: 'Interview scheduled.', data: application });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async rejectApplication(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !REJECTION_REASONS.includes(reason)) {
        res.status(400).json({ success: false, message: 'Valid rejection reason required' });
        return;
      }

      const aiMessage = await generateRejectionMessage(reason);

      const application = await prisma.application.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason, rejectionMessage: aiMessage },
        include: { job: true },
      });

      const seeker = await prisma.jobSeeker.findFirst({
        where: { userId: application.seekerId },
        include: { user: true },
      });
      const company = await prisma.company.findFirst({
        where: { id: application.job.companyId },
      });

      if (seeker && company) {
        await notificationHelper.applicationRejected(
          application.seekerId,
          seeker.user.email,
          seeker.fullName,
          application.job.title,
          company.companyName,
          reason,
          aiMessage,
          application.id
        );
      }

      res.json({ success: true, message: 'Application rejected.', data: application });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ADDED THIS METHOD TO FIX THE TSERROR
  async updateStatus(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
      }

      const application = await prisma.application.update({
        where: { id },
        data: { status },
      });

      res.json({ success: true, message: 'Status updated successfully', data: application });
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
      const applications = await prisma.application.findMany({
        where: { jobId: req.params.jobId },
        include: {
          job: true,
        },
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
      });

      const enriched = await Promise.all(
        applications.map(async (app) => {
          const seeker = await prisma.jobSeeker.findFirst({
            where: { userId: app.seekerId },
          });
          return { ...app, seekerName: seeker?.fullName || 'Unknown' };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (e) {
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

async function generateRejectionMessage(reason: string): Promise<string> {
  const messages: Record<string, string> = {
    'Insufficient experience': 'Your profile shows strong potential, but this role requires more hands-on experience in the field.',
    'Missing required technical skills': 'The role requires specific technical competencies that are not yet reflected in your CV.',
    'Qualification mismatch': 'The academic or professional qualifications listed in your CV do not fully align with our requirements.',
    'Overqualified for the role': 'Your impressive background suggests this role may not offer the challenge you deserve.',
    'Cultural fit concerns': 'While your skills are commendable, we felt the environment may not be the ideal match at this time.',
    'Position filled internally': 'This position has been filled through an internal promotion.',
    'Budget constraints': 'Due to internal budget adjustments, we are unable to proceed with external hires.',
  };
  return messages[reason] || 'We appreciate your interest and encourage you to apply to future openings.';
}
import { Request, Response } from 'express';
import { jobService } from '../services/job.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const jobController = {

  async createJob(req: Request, res: Response) {
    try {
      // 1. Find the company linked to the logged-in user
      const company = await prisma.company.findUnique({
        where: { userId: req.user!.userId }
      });

      // 2. Stop if there is no company profile
      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found. Please create it first.' });
        return;
      }

      // 3. Pass the actual company.id to the service
      const job = await jobService.createJob(company.id, req.body);
      res.status(201).json({ success: true, message: 'Job posted successfully', data: job });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'DEADLINE_PAST') {
          res.status(400).json({ success: false, message: 'Deadline must be a future date' });
          return;
        }
      }
      console.error('Create job error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getAllJobs(req: Request, res: Response) {
    try {
      const filters = {
        search: req.query.search as string,
        location: req.query.location as string,
        jobType: req.query.jobType as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };
      const result = await jobService.getAllJobs(filters);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getJobById(req: Request, res: Response) {
    try {
      const job = await jobService.getJobById(req.params.id as string);
      res.status(200).json({ success: true, data: job });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'JOB_NOT_FOUND') {
        res.status(404).json({ success: false, message: 'Job not found' });
        return;
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async getMyJobs(req: Request, res: Response) {
    try {
      const company = await prisma.company.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found.' });
        return;
      }

      const jobs = await jobService.getCompanyJobs(company.id);
      res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async updateJob(req: Request, res: Response) {
    try {
      const company = await prisma.company.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found.' });
        return;
      }

      const job = await jobService.updateJob(req.params.id as string, company.id, req.body);
      res.status(200).json({ success: true, message: 'Job updated', data: job });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'JOB_NOT_FOUND') {
          res.status(404).json({ success: false, message: 'Job not found' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ success: false, message: 'You can only edit your own jobs' });
          return;
        }
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async deleteJob(req: Request, res: Response) {
    try {
      const company = await prisma.company.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found.' });
        return;
      }

      await jobService.deleteJob(req.params.id as string, company.id);
      res.status(200).json({ success: true, message: 'Job deleted' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'JOB_NOT_FOUND') {
          res.status(404).json({ success: false, message: 'Job not found' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ success: false, message: 'You can only delete your own jobs' });
          return;
        }
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};
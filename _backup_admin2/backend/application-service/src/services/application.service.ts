import { applicationRepository } from '../repositories/application.repository';
import axios from 'axios';

export const applicationService = {

  async applyForJob(
    jobId: string,
    seekerId: string,
    cvUrl: string,
    coverLetter?: string
  ) {
    // Rule 1: Check the job actually exists and is still active
    try {
      const jobRes = await axios.get(
        `${process.env.JOB_SERVICE_URL}/api/v1/jobs/${jobId}`
      );
      const job = jobRes.data.data;

      if (job.status !== 'ACTIVE') {
        throw new Error('JOB_CLOSED');
      }

      if (new Date(job.deadline) < new Date()) {
        throw new Error('DEADLINE_PASSED');
      }
    } catch (err: unknown) {
      if (err instanceof Error &&
         (err.message === 'JOB_CLOSED' || err.message === 'DEADLINE_PASSED')) {
        throw err;
      }
      throw new Error('JOB_NOT_FOUND');
    }

    // Rule 2: Seeker cannot apply to the same job twice
    const existing = await applicationRepository.findExisting(jobId, seekerId);
    if (existing) throw new Error('ALREADY_APPLIED');

    return applicationRepository.create(jobId, seekerId, cvUrl, coverLetter);
  },

  async getMyApplications(seekerId: string) {
    return applicationRepository.findBySeeker(seekerId);
  },

  async getJobApplications(jobId: string, companyId: string) {
    // Verify this company owns the job
    const jobRes = await axios.get(
      `${process.env.JOB_SERVICE_URL}/api/v1/jobs/${jobId}`
    );
    const job = jobRes.data.data;

    if (job.companyId !== companyId) throw new Error('FORBIDDEN');

    return applicationRepository.findByJob(jobId);
  },

  async updateStatus(id: string, status: string, companyId: string) {
    const application = await applicationRepository.findById(id);
    if (!application) throw new Error('NOT_FOUND');

    // Verify this company owns the job the application is for
    if (application.job.companyId !== companyId) throw new Error('FORBIDDEN');

    return applicationRepository.updateStatus(id, status);
  },
};
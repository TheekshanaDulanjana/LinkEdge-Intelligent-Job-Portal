import { jobRepository } from '../repositories/job.repository';
import { CreateJobInput, UpdateJobInput, JobFilters } from '../types';

export const jobService = {

  async createJob(companyId: string, data: CreateJobInput) {
    // Business rule: deadline must be in the future
    const deadline = new Date(data.deadline);
    if (deadline <= new Date()) {
      throw new Error('DEADLINE_PAST');
    }
    return jobRepository.create(companyId, data);
  },

  async getAllJobs(filters: JobFilters) {
    return jobRepository.findAll(filters);
  },

  async getJobById(id: string) {
    const job = await jobRepository.findById(id);
    if (!job) throw new Error('JOB_NOT_FOUND');
    return job;
  },

  async getCompanyJobs(companyId: string) {
    return jobRepository.findByCompany(companyId);
  },

  async updateJob(id: string, companyId: string, data: UpdateJobInput) {
    const job = await jobRepository.findById(id);
    if (!job) throw new Error('JOB_NOT_FOUND');

    // Business rule: only the company that posted it can edit it
    if (job.companyId !== companyId) throw new Error('FORBIDDEN');

    return jobRepository.update(id, data);
  },

  async deleteJob(id: string, companyId: string) {
    const job = await jobRepository.findById(id);
    if (!job) throw new Error('JOB_NOT_FOUND');
    if (job.companyId !== companyId) throw new Error('FORBIDDEN');
    return jobRepository.delete(id);
  },
};
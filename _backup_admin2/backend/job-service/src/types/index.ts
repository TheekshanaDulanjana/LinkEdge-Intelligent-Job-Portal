export interface CreateJobInput {
  title: string;
  description: string;
  requirements: string;
  location: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';
  salaryMin?: number;
  salaryMax?: number;
  deadline: string;
}

export interface UpdateJobInput extends Partial<CreateJobInput> {
  status?: 'ACTIVE' | 'CLOSED' | 'DRAFT';
}

export interface JobFilters {
  search?: string;
  location?: string;
  jobType?: string;
  page?: number;
  limit?: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: 'SEEKER' | 'COMPANY';
}
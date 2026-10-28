/** Every Application column except the (large) CV text snapshot. Use in list endpoints. */
export const APPLICATION_LIST_SELECT = {
  id: true, jobId: true, seekerId: true, cvUrl: true, coverLetter: true, status: true,
  rejectionReason: true, rejectionMessage: true,
  interviewDate: true, interviewTime: true, interviewVenue: true, practiceExpiresAt: true,
  aiScore: true, atsScore: true, atsBreakdown: true,
  autoRejected: true, companyOverride: true, screenedAt: true,
  createdAt: true, updatedAt: true,
} as const;

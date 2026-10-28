-- Auto-screening: per-job threshold and system-rejection tracking
ALTER TABLE "JobPosting"
  ADD COLUMN IF NOT EXISTS "autoScreen" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "minMatchScore" INTEGER NOT NULL DEFAULT 35;

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "autoRejected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "companyOverride" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "screenedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Application_jobId_seekerId_idx" ON "Application"("jobId", "seekerId");
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application"("status");

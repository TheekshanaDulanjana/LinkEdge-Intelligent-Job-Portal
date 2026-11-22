-- Job match alerts: seeker opt-out flag + one-row-per-email log (idempotent alerts)
ALTER TABLE "JobSeeker" ADD COLUMN IF NOT EXISTS "emailJobAlerts" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "JobMatchAlert" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobMatchAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobMatchAlert_jobId_userId_key" ON "JobMatchAlert"("jobId", "userId");
CREATE INDEX IF NOT EXISTS "JobMatchAlert_userId_sentAt_idx" ON "JobMatchAlert"("userId", "sentAt");
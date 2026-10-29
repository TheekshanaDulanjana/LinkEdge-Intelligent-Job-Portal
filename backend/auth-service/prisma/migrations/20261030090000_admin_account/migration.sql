-- Admin self-service: verified e-mail change
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "pendingEmailAttempts" INTEGER NOT NULL DEFAULT 0;

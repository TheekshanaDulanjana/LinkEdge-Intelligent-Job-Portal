-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "atsBreakdown" JSONB,
ADD COLUMN     "atsScore" DOUBLE PRECISION,
ADD COLUMN     "cvTextSnapshot" TEXT;

-- CreateTable
CREATE TABLE "CandidateResume" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedText" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" DOUBLE PRECISION,
    "experience" JSONB,
    "education" JSONB,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobTitle" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "isParsed" BOOLEAN NOT NULL DEFAULT false,
    "parseError" TEXT,

    CONSTRAINT "CandidateResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ATSScore" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "technicalScore" DOUBLE PRECISION NOT NULL,
    "experienceScore" DOUBLE PRECISION NOT NULL,
    "educationScore" DOUBLE PRECISION NOT NULL,
    "certificationScore" DOUBLE PRECISION NOT NULL,
    "keywordScore" DOUBLE PRECISION NOT NULL,
    "matchedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "breakdown" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ATSScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateResume_candidateId_key" ON "CandidateResume"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateResume_candidateId_idx" ON "CandidateResume"("candidateId");

-- CreateIndex
CREATE INDEX "ATSScore_jobId_idx" ON "ATSScore"("jobId");

-- CreateIndex
CREATE INDEX "ATSScore_resumeId_idx" ON "ATSScore"("resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "ATSScore_resumeId_jobId_key" ON "ATSScore"("resumeId", "jobId");

-- AddForeignKey
ALTER TABLE "CandidateResume" ADD CONSTRAINT "CandidateResume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ATSScore" ADD CONSTRAINT "ATSScore_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "CandidateResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

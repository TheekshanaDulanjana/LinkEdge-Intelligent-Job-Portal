/*
  Warnings:

  - You are about to drop the `ATSScore` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandidateResume` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ATSScore" DROP CONSTRAINT "ATSScore_resumeId_fkey";

-- DropForeignKey
ALTER TABLE "CandidateResume" DROP CONSTRAINT "CandidateResume_candidateId_fkey";

-- DropTable
DROP TABLE "ATSScore";

-- DropTable
DROP TABLE "CandidateResume";

-- CreateTable
CREATE TABLE "candidate_resumes" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsed_text" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience_years" DOUBLE PRECISION,
    "experience" JSONB,
    "education" JSONB,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "job_title" TEXT,
    "is_parsed" BOOLEAN NOT NULL DEFAULT false,
    "parse_error" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ats_scores" (
    "id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "technical_score" DOUBLE PRECISION NOT NULL,
    "experience_score" DOUBLE PRECISION NOT NULL,
    "education_score" DOUBLE PRECISION NOT NULL,
    "certification_score" DOUBLE PRECISION NOT NULL,
    "keyword_score" DOUBLE PRECISION NOT NULL,
    "matched_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missing_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "breakdown" JSONB NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ats_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_resumes_candidate_id_key" ON "candidate_resumes"("candidate_id");

-- CreateIndex
CREATE INDEX "ats_scores_job_id_idx" ON "ats_scores"("job_id");

-- CreateIndex
CREATE INDEX "ats_scores_resume_id_idx" ON "ats_scores"("resume_id");

-- CreateIndex
CREATE UNIQUE INDEX "ats_scores_resume_id_job_id_key" ON "ats_scores"("resume_id", "job_id");

-- AddForeignKey
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_scores" ADD CONSTRAINT "ats_scores_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "candidate_resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

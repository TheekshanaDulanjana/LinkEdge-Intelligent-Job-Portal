/*
  Warnings:

  - The values [INACTIVE] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `interviewDate` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `interviewTime` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `interviewVenue` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `practiceExpiresAt` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionMessage` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `aboutUs` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageUrl` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `interestArea` on the `JobSeeker` table. All the data in the column will be lost.
  - You are about to drop the column `professionalSummary` on the `JobSeeker` table. All the data in the column will be lost.
  - You are about to drop the column `profileImageUrl` on the `JobSeeker` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `JobSeeker` table. All the data in the column will be lost.
  - You are about to drop the column `workStatus` on the `JobSeeker` table. All the data in the column will be lost.
  - You are about to drop the column `authProvider` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `googleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isEmailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetTokenExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('ACTIVE', 'CLOSED', 'DRAFT');
ALTER TABLE "JobPosting" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JobPosting" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "JobStatus_old";
ALTER TABLE "JobPosting" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_userId_fkey";

-- DropForeignKey
ALTER TABLE "JobSeeker" DROP CONSTRAINT "JobSeeker_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_senderId_fkey";

-- DropIndex
DROP INDEX "User_googleId_key";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "interviewDate",
DROP COLUMN "interviewTime",
DROP COLUMN "interviewVenue",
DROP COLUMN "practiceExpiresAt",
DROP COLUMN "rejectionMessage",
DROP COLUMN "rejectionReason";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "aboutUs",
DROP COLUMN "coverImageUrl",
DROP COLUMN "phone",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "JobSeeker" DROP COLUMN "interestArea",
DROP COLUMN "professionalSummary",
DROP COLUMN "profileImageUrl",
DROP COLUMN "updatedAt",
DROP COLUMN "workStatus";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "authProvider",
DROP COLUMN "googleId",
DROP COLUMN "isEmailVerified",
DROP COLUMN "resetToken",
DROP COLUMN "resetTokenExpiresAt",
DROP COLUMN "verificationCode",
DROP COLUMN "verificationExpiresAt",
ALTER COLUMN "passwordHash" SET NOT NULL;

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "AuthProvider";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "WorkStatus";

-- AddForeignKey
ALTER TABLE "JobSeeker" ADD CONSTRAINT "JobSeeker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "JobSeeker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

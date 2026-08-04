-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('REMOTE', 'ON_SITE', 'HYBRID');

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "department" TEXT,
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "locationType" "LocationType" NOT NULL DEFAULT 'REMOTE',
ADD COLUMN     "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];

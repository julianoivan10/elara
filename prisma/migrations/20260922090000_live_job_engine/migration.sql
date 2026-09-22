-- CreateEnum
CREATE TYPE "ApplicationMethod" AS ENUM ('EXTERNAL_LINK', 'ASSISTED', 'ATS');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'PREPARED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiTaskKind" ADD VALUE 'COVER_LETTER';
ALTER TYPE "AiTaskKind" ADD VALUE 'JOB_MATCH';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "desiredSalaryCurrency" TEXT,
ADD COLUMN     "desiredSalaryMin" INTEGER,
ADD COLUMN     "preferredEmploymentTypes" "EmploymentType"[] DEFAULT ARRAY[]::"EmploymentType"[],
ADD COLUMN     "preferredLocationTypes" "LocationType"[] DEFAULT ARRAY[]::"LocationType"[],
ADD COLUMN     "preferredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "applicationMethod" "ApplicationMethod" NOT NULL DEFAULT 'EXTERNAL_LINK',
ADD COLUMN     "companyLogoUrl" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "descriptionIsExcerpt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inactiveReason" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "locationSearch" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "providerUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "salaryAnnualMax" INTEGER,
ADD COLUMN     "salaryAnnualMin" INTEGER,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ALTER COLUMN "locationType" DROP NOT NULL,
ALTER COLUMN "locationType" DROP DEFAULT,
ALTER COLUMN "employmentType" DROP NOT NULL,
ALTER COLUMN "employmentType" DROP DEFAULT,
ALTER COLUMN "seniority" DROP NOT NULL,
ALTER COLUMN "seniority" DROP DEFAULT,
ALTER COLUMN "postedAt" DROP NOT NULL,
ALTER COLUMN "postedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "coverLetter" TEXT,
ADD COLUMN     "method" "ApplicationMethod" NOT NULL DEFAULT 'EXTERNAL_LINK',
ADD COLUMN     "preparedAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "resumeId" TEXT,
ADD COLUMN     "resumeSnapshot" JSONB;

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastJobCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_provider_key_key" ON "JobSource"("provider", "key");

-- CreateIndex
CREATE INDEX "Job_isActive_isDemo_postedAt_idx" ON "Job"("isActive", "isDemo", "postedAt");

-- CreateIndex
CREATE INDEX "Job_sourceId_idx" ON "Job"("sourceId");

-- CreateIndex
CREATE INDEX "Job_fingerprint_idx" ON "Job"("fingerprint");

-- CreateIndex
CREATE INDEX "Job_skills_idx" ON "Job" USING GIN ("skills");

-- CreateIndex
CREATE INDEX "Application_userId_jobId_idx" ON "Application"("userId", "jobId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;


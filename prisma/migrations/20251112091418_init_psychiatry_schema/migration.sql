/*
  Warnings:

  - The `healthIssues` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `crisisHistories` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `treatmentProgress` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sessionHistory` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "overallProgress" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'active',
ADD COLUMN     "treatmentGoals" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "healthIssues",
ADD COLUMN     "healthIssues" JSONB,
DROP COLUMN "crisisHistories",
ADD COLUMN     "crisisHistories" JSONB,
DROP COLUMN "treatmentProgress",
ADD COLUMN     "treatmentProgress" JSONB,
DROP COLUMN "sessionHistory",
ADD COLUMN     "sessionHistory" JSONB;

/*
  Warnings:

  - Made the column `scheduledDate` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `scheduledTime` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `appointments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "scheduledDate" SET NOT NULL,
ALTER COLUMN "scheduledTime" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

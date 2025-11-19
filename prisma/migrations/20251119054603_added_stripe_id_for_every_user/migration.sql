/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `PrivateClinic` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Therapist` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PrivateClinic" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PrivateClinic_stripeCustomerId_key" ON "PrivateClinic"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Therapist_stripeCustomerId_key" ON "Therapist"("stripeCustomerId");

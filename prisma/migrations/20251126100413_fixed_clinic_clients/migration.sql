/*
  Warnings:

  - You are about to drop the `_ClientToPrivateClinic` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_therapistId_fkey";

-- DropForeignKey
ALTER TABLE "_ClientToPrivateClinic" DROP CONSTRAINT "_ClientToPrivateClinic_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClientToPrivateClinic" DROP CONSTRAINT "_ClientToPrivateClinic_B_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "clinicId" TEXT,
ALTER COLUMN "therapistId" DROP NOT NULL;

-- DropTable
DROP TABLE "_ClientToPrivateClinic";

-- CreateIndex
CREATE INDEX "Client_therapistId_idx" ON "Client"("therapistId");

-- CreateIndex
CREATE INDEX "Client_clinicId_idx" ON "Client"("clinicId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "PrivateClinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

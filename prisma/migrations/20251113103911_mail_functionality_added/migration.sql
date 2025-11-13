/*
  Warnings:

  - You are about to drop the `Support` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Support" DROP CONSTRAINT "Support_clinicId_fkey";

-- DropForeignKey
ALTER TABLE "Support" DROP CONSTRAINT "Support_therapistId_fkey";

-- DropTable
DROP TABLE "Support";

-- CreateTable
CREATE TABLE "supports" (
    "id" TEXT NOT NULL,
    "ownerType" "UserType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clinicId" TEXT,
    "therapistId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "adminReply" TEXT,
    "adminRepliedAt" TIMESTAMP(3),
    "adminEmail" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supports_ownerId_idx" ON "supports"("ownerId");

-- CreateIndex
CREATE INDEX "supports_ownerType_idx" ON "supports"("ownerType");

-- CreateIndex
CREATE INDEX "supports_status_idx" ON "supports"("status");

-- CreateIndex
CREATE INDEX "supports_clinicId_idx" ON "supports"("clinicId");

-- CreateIndex
CREATE INDEX "supports_therapistId_idx" ON "supports"("therapistId");

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "PrivateClinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

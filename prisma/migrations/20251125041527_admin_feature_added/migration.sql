/*
  Warnings:

  - The primary key for the `_ClientToPrivateClinic` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_ClientToPrivateClinic` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_ClientToPrivateClinic" DROP CONSTRAINT "_ClientToPrivateClinic_AB_pkey";

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_ClientToPrivateClinic_AB_unique" ON "_ClientToPrivateClinic"("A", "B");

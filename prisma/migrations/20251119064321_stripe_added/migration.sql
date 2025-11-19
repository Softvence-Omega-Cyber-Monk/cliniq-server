/*
  Warnings:

  - You are about to drop the column `cardEntity` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `cardNumber` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `cardholderName` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `cvv` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `ownerType` on the `PaymentMethod` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripePaymentMethodId]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePriceId]` on the table `SubscriptionPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billingAddressLine1` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingCity` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingCountry` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingPostalCode` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingState` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cardBrand` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cardHolderName` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cardLast4` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryMonth` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryYear` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeCustomerId` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripePaymentMethodId` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('succeeded', 'pending', 'failed', 'canceled', 'refunded');

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_clinicId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_therapistId_fkey";

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "cardEntity",
DROP COLUMN "cardNumber",
DROP COLUMN "cardholderName",
DROP COLUMN "cvv",
DROP COLUMN "expiryDate",
DROP COLUMN "ownerId",
DROP COLUMN "ownerType",
ADD COLUMN     "billingAddressLine1" TEXT NOT NULL,
ADD COLUMN     "billingAddressLine2" TEXT,
ADD COLUMN     "billingCity" TEXT NOT NULL,
ADD COLUMN     "billingCountry" TEXT NOT NULL,
ADD COLUMN     "billingPostalCode" TEXT NOT NULL,
ADD COLUMN     "billingState" TEXT NOT NULL,
ADD COLUMN     "cardBrand" TEXT NOT NULL,
ADD COLUMN     "cardHolderName" TEXT NOT NULL,
ADD COLUMN     "cardLast4" VARCHAR(4) NOT NULL,
ADD COLUMN     "expiryMonth" VARCHAR(2) NOT NULL,
ADD COLUMN     "expiryYear" VARCHAR(4) NOT NULL,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT NOT NULL,
ADD COLUMN     "stripePaymentMethodId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "clinicId" TEXT,
    "therapistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "stripeChargeId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "paymentMethodLast4" TEXT NOT NULL,
    "paymentMethodBrand" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'subscription',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "clinicId" TEXT,
    "therapistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_clinicId_idx" ON "Subscription"("clinicId");

-- CreateIndex
CREATE INDEX "Subscription_therapistId_idx" ON "Subscription"("therapistId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_clinicId_idx" ON "PaymentMethod"("clinicId");

-- CreateIndex
CREATE INDEX "PaymentMethod_therapistId_idx" ON "PaymentMethod"("therapistId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_stripePriceId_key" ON "SubscriptionPlan"("stripePriceId");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "PrivateClinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "PrivateClinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "PrivateClinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

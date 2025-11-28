-- CreateEnum
CREATE TYPE "PlanRole" AS ENUM ('CLINIC', 'INDIVIDUAL_THERAPIST');

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "role" "PlanRole" DEFAULT 'CLINIC';

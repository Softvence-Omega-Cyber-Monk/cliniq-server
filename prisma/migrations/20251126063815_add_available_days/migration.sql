-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "availableDays" TEXT[] DEFAULT ARRAY[]::TEXT[];

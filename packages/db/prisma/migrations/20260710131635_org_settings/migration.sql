-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "taxRateBps" INTEGER NOT NULL DEFAULT 0;

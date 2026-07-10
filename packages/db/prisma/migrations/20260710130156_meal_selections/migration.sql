-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "mealSelections" JSONB NOT NULL DEFAULT '[]';

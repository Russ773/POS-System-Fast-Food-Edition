-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "isCombo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboComponent" (
    "id" TEXT NOT NULL,
    "comboItemId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ComboComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeComponent_menuItemId_idx" ON "RecipeComponent"("menuItemId");

-- CreateIndex
CREATE INDEX "RecipeComponent_inventoryItemId_idx" ON "RecipeComponent"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ComboComponent_comboItemId_idx" ON "ComboComponent"("comboItemId");

-- CreateIndex
CREATE INDEX "ComboComponent_componentItemId_idx" ON "ComboComponent"("componentItemId");

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboComponent" ADD CONSTRAINT "ComboComponent_comboItemId_fkey" FOREIGN KEY ("comboItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboComponent" ADD CONSTRAINT "ComboComponent_componentItemId_fkey" FOREIGN KEY ("componentItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

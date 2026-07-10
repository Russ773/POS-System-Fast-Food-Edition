import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: { name: "Sample Burger Co." },
  });

  const location = await prisma.location.create({
    data: {
      orgId: org.id,
      name: "Downtown",
      address: "123 Main St",
    },
  });

  await prisma.user.create({
    data: {
      orgId: org.id,
      name: "Owner Admin",
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("password123", 10),
      role: "OWNER",
    },
  });

  await prisma.employee.create({
    data: {
      locationId: location.id,
      name: "Alex Cook",
      pinHash: await bcrypt.hash("1234", 10),
      hourlyRateCents: 1800,
    },
  });

  const burgers = await prisma.menuCategory.create({
    data: { orgId: org.id, name: "Burgers", sortOrder: 1 },
  });

  const sides = await prisma.menuCategory.create({
    data: { orgId: org.id, name: "Sides", sortOrder: 2 },
  });

  const cheeseburger = await prisma.menuItem.create({
    data: {
      orgId: org.id,
      categoryId: burgers.id,
      name: "Cheeseburger",
      description: "Classic beef patty with cheddar",
      priceCents: 599,
    },
  });

  await prisma.modifierGroup.create({
    data: {
      menuItemId: cheeseburger.id,
      name: "Size",
      minSelect: 1,
      maxSelect: 1,
      modifiers: {
        create: [
          { name: "Single", priceDeltaCents: 0 },
          { name: "Double", priceDeltaCents: 200 },
        ],
      },
    },
  });

  // Build ingredients: defaults can be held; some can be added / made extra.
  await prisma.menuItemIngredient.createMany({
    data: [
      { menuItemId: cheeseburger.id, name: "Lettuce", includedByDefault: true, removable: true, addable: false, sortOrder: 1 },
      { menuItemId: cheeseburger.id, name: "Onion", includedByDefault: true, removable: true, addable: false, sortOrder: 2 },
      { menuItemId: cheeseburger.id, name: "Tomato", includedByDefault: true, removable: true, addable: false, sortOrder: 3 },
      { menuItemId: cheeseburger.id, name: "Cheese", includedByDefault: true, removable: true, addable: true, extraPriceCents: 50, sortOrder: 4 },
      { menuItemId: cheeseburger.id, name: "Ketchup", includedByDefault: false, removable: false, addable: true, extraPriceCents: 0, sortOrder: 5 },
      { menuItemId: cheeseburger.id, name: "Bacon", includedByDefault: false, removable: false, addable: true, extraPriceCents: 150, sortOrder: 6 },
    ],
  });

  const fries = await prisma.menuItem.create({
    data: {
      orgId: org.id,
      categoryId: sides.id,
      name: "Fries",
      description: "Crispy golden fries",
      priceCents: 299,
    },
  });

  const groundBeef = await prisma.inventoryItem.create({
    data: {
      locationId: location.id,
      name: "Ground Beef",
      unit: "lb",
      quantityOnHand: 50,
      reorderThreshold: 10,
    },
  });

  // Recipe: each Cheeseburger uses 0.25 lb of Ground Beef (auto-depletes stock).
  await prisma.recipeComponent.create({
    data: { menuItemId: cheeseburger.id, inventoryItemId: groundBeef.id, quantity: 0.25 },
  });

  // A combo: Cheeseburger + Fries bundled at a set price.
  await prisma.menuItem.create({
    data: {
      orgId: org.id,
      categoryId: burgers.id,
      name: "Cheeseburger Combo",
      description: "Cheeseburger + Fries",
      priceCents: 799,
      isCombo: true,
      comboComponents: {
        create: [
          { componentItemId: cheeseburger.id, quantity: 1 },
          { componentItemId: fries.id, quantity: 1 },
        ],
      },
    },
  });

  console.log("Seed complete.");
  console.log(`Org: ${org.name} (${org.id})`);
  console.log(`Location: ${location.name} (${location.id})`);
  console.log("Admin login: admin@example.com / password123");
  console.log("Employee PIN: 1234 (Alex Cook)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

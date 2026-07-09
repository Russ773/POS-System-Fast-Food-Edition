import type { AppliedCustomization, MenuItem, SelectedModifier } from "@pos/shared";

export interface CartLine {
  lineId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  customizations: AppliedCustomization[];
  notes?: string;
}

export function lineUnitPriceCents(line: CartLine): number {
  return (
    line.menuItem.priceCents +
    line.selectedModifiers.reduce((sum, m) => sum + m.priceDeltaCents, 0) +
    line.customizations.reduce((sum, c) => sum + c.priceDeltaCents, 0)
  );
}

export function lineTotalCents(line: CartLine): number {
  return lineUnitPriceCents(line) * line.quantity;
}

export function cartTotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

// Short human-readable customization summary for cart/receipt display,
// e.g. "NO Onion, EXTRA Cheese, ADD Bacon".
export function customizationSummary(customizations: AppliedCustomization[]): string {
  return customizations.map((c) => `${c.action} ${c.name}`).join(", ");
}

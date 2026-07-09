import type { MenuItem, SelectedModifier } from "@pos/shared";

export interface CartLine {
  lineId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  notes?: string;
}

export function lineUnitPriceCents(line: CartLine): number {
  return (
    line.menuItem.priceCents +
    line.selectedModifiers.reduce((sum, m) => sum + m.priceDeltaCents, 0)
  );
}

export function lineTotalCents(line: CartLine): number {
  return lineUnitPriceCents(line) * line.quantity;
}

export function cartTotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

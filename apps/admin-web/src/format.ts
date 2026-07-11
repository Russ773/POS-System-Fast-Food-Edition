import { formatMoney } from "@pos/shared";

// Active currency, updated on login / settings load so all formatting follows it.
let activeCurrency = localStorage.getItem("pos_admin_currency") ?? "USD";

export function setCurrency(currency: string) {
  activeCurrency = currency;
  localStorage.setItem("pos_admin_currency", currency);
}

export function centsToDollars(cents: number): string {
  return formatMoney(cents, activeCurrency);
}

export function dollarsToCents(dollars: string): number {
  return Math.round(parseFloat(dollars || "0") * 100);
}

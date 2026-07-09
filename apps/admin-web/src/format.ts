export function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function dollarsToCents(dollars: string): number {
  return Math.round(parseFloat(dollars || "0") * 100);
}

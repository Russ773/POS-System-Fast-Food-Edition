// Currency-aware money formatting shared across apps. Cents -> localized string.
export function formatMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    // Unknown currency code — fall back to a plain number with the code.
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

// A small, curated set of common currencies for the settings dropdown.
export const SUPPORTED_CURRENCIES: { code: string; label: string }[] = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "INR", label: "Indian Rupee (₹)" },
];

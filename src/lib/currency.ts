/**
 * Canonical supported currency list for AutoEco.
 *
 * Single source of truth. Used by:
 *   - Zod schemas (so APIs reject "XXX", "ABC", etc.)
 *   - User preferences
 *   - Vehicle purchase / resale currency
 *   - Expense / Fuel currency
 *   - Savings goals / Reports
 */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "MAD", "GBP", "CAD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(v: unknown): v is SupportedCurrency {
  return typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);
}

/** Returns a Zod-compatible enum schema string for documentation. */
export const SUPPORTED_CURRENCIES_HUMAN = SUPPORTED_CURRENCIES.join(", ");

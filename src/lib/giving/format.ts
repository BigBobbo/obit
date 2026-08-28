/**
 * The client-safe corner of giving: formatting and EIN shape, with no server
 * imports, so the steward panel can render a total without dragging
 * `node:crypto` into the browser bundle.
 */

export function normalizeEin(ein: string): string {
  const digits = ein.replace(/\D/g, "");
  return digits.length === 9 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : ein.trim();
}

export function isValidEin(ein: string): boolean {
  return /^[0-9]{2}-[0-9]{7}$/.test(ein);
}

/** "$2,340 given in Maura's memory" — the only shape an amount ever takes. */
export function formatGivingTotal(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

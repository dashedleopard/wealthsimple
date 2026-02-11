// Use a generic type to avoid importing Prisma's Decimal at the module level.
// Prisma Decimal has a .toString() and Number() coercion, which is all we need.
type Numeric = number | string | { toString(): string };

export function formatCurrency(value: Numeric, currency = "CAD"): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCompactCurrency(
  value: Numeric,
  currency = "CAD"
): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (Math.abs(num) >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(num, currency);
}

export function formatPercent(value: Numeric): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

export function formatNumber(value: Numeric): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return new Intl.NumberFormat("en-CA").format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function toNumber(value: Numeric): number {
  return typeof value === "number" ? value : parseFloat(String(value));
}

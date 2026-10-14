export type CartLine = { productId: string; name: string; priceCents: number; qty: number };

const MAX_QTY = 99;

export function parseCartChange(body: unknown): { productId: string; qty: number } | { error: string } {
  const b = (body ?? {}) as { productId?: unknown; qty?: unknown };
  if (typeof b.productId !== "string" || b.productId.length === 0) return { error: "Which product?" };
  if (typeof b.qty !== "number" || !Number.isInteger(b.qty) || b.qty < 1 || b.qty > MAX_QTY) {
    return { error: `Quantity is a whole number from 1 to ${MAX_QTY}` };
  }
  return { productId: b.productId, qty: b.qty };
}

export const cartTotalCents = (items: CartLine[]): number =>
  items.reduce((sum, line) => sum + line.priceCents * line.qty, 0);

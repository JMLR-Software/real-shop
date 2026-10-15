import type { CartLine } from "./cart-rules";

export type OrderRow = { id: string; userId: string; stripeSessionId: string; amountCents: number; status: "paid"; createdAt: number };
export type OrderItemRow = { orderId: string; productId: string; qty: number; priceCents: number };
export type OrderItem = { productId: string; qty: number; priceCents: number };

/**
 * Reads the cart snapshot that checkout put in the Stripe session's metadata. It comes from
 * outside the Worker, so it is checked: null unless it is a non-empty list of well-formed items.
 */
export function parseOrderItems(raw: string | null | undefined): OrderItem[] | null {
  if (!raw) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const items: OrderItem[] = [];
  for (const entry of parsed) {
    const e = (entry ?? {}) as { productId?: unknown; qty?: unknown; priceCents?: unknown };
    if (typeof e.productId !== "string" || e.productId.length === 0) return null;
    if (typeof e.qty !== "number" || !Number.isInteger(e.qty) || e.qty < 1) return null;
    if (typeof e.priceCents !== "number" || !Number.isInteger(e.priceCents) || e.priceCents < 0) return null;
    items.push({ productId: e.productId, qty: e.qty, priceCents: e.priceCents });
  }
  return items;
}

export function orderRows(userId: string, sessionId: string, items: OrderItem[], amountCents: number, now: number) {
  const order: OrderRow = {
    id: `ord_${crypto.randomUUID()}`,
    userId,
    stripeSessionId: sessionId,
    amountCents,
    status: "paid",
    createdAt: now,
  };
  return { order, items: items.map((l) => ({ orderId: order.id, productId: l.productId, qty: l.qty, priceCents: l.priceCents })) };
}

export async function cartLines(db: D1Database, userId: string): Promise<CartLine[]> {
  const { results } = await db.prepare(
    `select c.productId, p.name, p.priceCents, c.qty from cart_item c join product p on p.id = c.productId where c.userId = ? order by c.updatedAt`,
  ).bind(userId).all<CartLine>();
  return results;
}

/**
 * Writes the order and empties the cart, in one batch. The items come from the Checkout session's
 * snapshot and the amount is what Stripe charged, so the order is what was paid for even if the
 * cart changed since. Idempotent on the Stripe session id: Stripe retries webhooks, and a retry
 * must not make a second order.
 */
export async function recordOrder(
  db: D1Database, userId: string, sessionId: string, items: OrderItem[], amountCents: number, now: number,
): Promise<"recorded" | "already"> {
  const already = await db.prepare(`select 1 from "order" where stripeSessionId = ?`).bind(sessionId).first();
  if (already) return "already";
  const rows = orderRows(userId, sessionId, items, amountCents, now);
  await db.batch([
    db.prepare(`insert into "order" (id, userId, stripeSessionId, amountCents, status, createdAt) values (?, ?, ?, ?, ?, ?)`)
      .bind(rows.order.id, rows.order.userId, rows.order.stripeSessionId, rows.order.amountCents, rows.order.status, rows.order.createdAt),
    ...rows.items.map((i) => db.prepare(`insert into order_item (orderId, productId, qty, priceCents) values (?, ?, ?, ?)`).bind(i.orderId, i.productId, i.qty, i.priceCents)),
    db.prepare(`delete from cart_item where userId = ?`).bind(userId),
  ]);
  return "recorded";
}

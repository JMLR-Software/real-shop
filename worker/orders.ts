import { cartTotalCents, type CartLine } from "./cart-rules";

export type OrderRow = { id: string; userId: string; stripeSessionId: string; amountCents: number; status: "paid"; createdAt: number };
export type OrderItemRow = { orderId: string; productId: string; qty: number; priceCents: number };

export function orderRows(userId: string, sessionId: string, items: CartLine[], now: number) {
  const order: OrderRow = {
    id: `ord_${crypto.randomUUID()}`,
    userId,
    stripeSessionId: sessionId,
    amountCents: cartTotalCents(items),
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
 * Writes the order from the person's cart and empties the cart, in one batch. Idempotent on the
 * Stripe session id: Stripe retries webhooks, and a retry must not make a second order.
 */
export async function recordOrder(db: D1Database, userId: string, sessionId: string, now: number): Promise<"recorded" | "already"> {
  const already = await db.prepare(`select 1 from "order" where stripeSessionId = ?`).bind(sessionId).first();
  if (already) return "already";
  const items = await cartLines(db, userId);
  const rows = orderRows(userId, sessionId, items, now);
  await db.batch([
    db.prepare(`insert into "order" (id, userId, stripeSessionId, amountCents, status, createdAt) values (?, ?, ?, ?, ?, ?)`)
      .bind(rows.order.id, rows.order.userId, rows.order.stripeSessionId, rows.order.amountCents, rows.order.status, rows.order.createdAt),
    ...rows.items.map((i) => db.prepare(`insert into order_item (orderId, productId, qty, priceCents) values (?, ?, ?, ?)`).bind(i.orderId, i.productId, i.qty, i.priceCents)),
    db.prepare(`delete from cart_item where userId = ?`).bind(userId),
  ]);
  return "recorded";
}

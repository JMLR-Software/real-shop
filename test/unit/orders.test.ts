import { describe, expect, it } from "vitest";
import { orderRows } from "../../worker/orders";

const items = [
  { productId: "candle", name: "c", priceCents: 1800, qty: 2 },
  { productId: "wick", name: "w", priceCents: 400, qty: 1 },
];

describe("orderRows", () => {
  it("prices the order from the cart at the time", () => {
    const { order, items: rows } = orderRows("u1", "cs_test_1", items, 1_700_000_000_000);
    expect(order).toMatchObject({ userId: "u1", stripeSessionId: "cs_test_1", amountCents: 4000, status: "paid", createdAt: 1_700_000_000_000 });
    expect(order.id).toMatch(/^ord_/);
    expect(rows).toEqual([
      { orderId: order.id, productId: "candle", qty: 2, priceCents: 1800 },
      { orderId: order.id, productId: "wick", qty: 1, priceCents: 400 },
    ]);
  });
});

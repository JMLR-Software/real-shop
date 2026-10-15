import { describe, expect, it } from "vitest";
import { orderRows, parseOrderItems } from "../../worker/orders";

const items = [
  { productId: "candle", priceCents: 1800, qty: 2 },
  { productId: "wick", priceCents: 400, qty: 1 },
];

describe("orderRows", () => {
  it("uses the amount Stripe charged and the items it is given", () => {
    const { order, items: rows } = orderRows("u1", "cs_test_1", items, 4100, 1_700_000_000_000);
    expect(order).toMatchObject({ userId: "u1", stripeSessionId: "cs_test_1", amountCents: 4100, status: "paid", createdAt: 1_700_000_000_000 });
    expect(order.id).toMatch(/^ord_/);
    expect(rows).toEqual([
      { orderId: order.id, productId: "candle", qty: 2, priceCents: 1800 },
      { orderId: order.id, productId: "wick", qty: 1, priceCents: 400 },
    ]);
  });
});

describe("parseOrderItems", () => {
  it("reads a valid snapshot", () => {
    expect(parseOrderItems(JSON.stringify(items))).toEqual(items);
  });

  it("allows a free item", () => {
    expect(parseOrderItems('[{"productId":"p","qty":1,"priceCents":0}]')).toHaveLength(1);
  });

  it("is null for an empty list", () => {
    expect(parseOrderItems("[]")).toBeNull();
  });

  it("is null when it is not JSON", () => {
    expect(parseOrderItems("{nope")).toBeNull();
  });

  it("is null for nothing at all", () => {
    expect(parseOrderItems(null)).toBeNull();
    expect(parseOrderItems(undefined)).toBeNull();
    expect(parseOrderItems("")).toBeNull();
  });

  it.each([
    ["not an array", '{"productId":"p","qty":1,"priceCents":1}'],
    ["a null entry", "[null]"],
    ["an empty productId", '[{"productId":"","qty":1,"priceCents":1}]'],
    ["a numeric productId", '[{"productId":5,"qty":1,"priceCents":1}]'],
    ["qty zero", '[{"productId":"p","qty":0,"priceCents":1}]'],
    ["a fractional qty", '[{"productId":"p","qty":1.5,"priceCents":1}]'],
    ["a string qty", '[{"productId":"p","qty":"1","priceCents":1}]'],
    ["a negative price", '[{"productId":"p","qty":1,"priceCents":-1}]'],
    ["a fractional price", '[{"productId":"p","qty":1,"priceCents":1.5}]'],
    ["a missing price", '[{"productId":"p","qty":1}]'],
    ["one bad entry among good ones", '[{"productId":"p","qty":1,"priceCents":1},{"productId":"q","qty":0,"priceCents":1}]'],
  ])("is null for %s", (_name, raw) => {
    expect(parseOrderItems(raw)).toBeNull();
  });
});

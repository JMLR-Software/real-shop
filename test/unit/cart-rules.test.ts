import { describe, expect, it } from "vitest";
import { cartTotalCents, parseCartChange } from "../../worker/cart-rules";

describe("parseCartChange", () => {
  it("accepts a product id and a whole positive qty", () => {
    expect(parseCartChange({ productId: "candle", qty: 2 })).toEqual({ productId: "candle", qty: 2 });
  });
  it.each([0, -1, 1.5, "2", null, 100])("rejects a bad quantity: %s", (qty) => {
    expect(parseCartChange({ productId: "candle", qty })).toEqual({ error: "Quantity is a whole number from 1 to 99" });
  });
  it("rejects a missing product", () => {
    expect(parseCartChange({ qty: 1 })).toEqual({ error: "Which product?" });
  });
});

describe("cartTotalCents", () => {
  it("sums price times qty", () => {
    expect(cartTotalCents([
      { productId: "candle", name: "c", priceCents: 1800, qty: 2 },
      { productId: "wick", name: "w", priceCents: 400, qty: 1 },
    ])).toBe(4000);
  });
  it("is 0 for an empty cart", () => expect(cartTotalCents([])).toBe(0));
});

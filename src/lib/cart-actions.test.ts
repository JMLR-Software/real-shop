import { describe, expect, it } from "vitest";
import { addToCart } from "./cart-actions";

describe("addToCart", () => {
  it("says Added once the API has answered", async () => {
    const seen: string[] = [];
    await addToCart({ api: async () => ({}), setStatus: (s) => seen.push(s) }, "candle");
    expect(seen.at(-1)).toBe("Added");
  });
  it("does not say Added when the API failed", async () => {
    const seen: string[] = [];
    await addToCart({ api: async () => { throw new Error("Not signed in"); }, setStatus: (s) => seen.push(s) }, "candle");
    expect(seen).not.toContain("Added");
    expect(seen.at(-1)).toBe("Not signed in");
  });
});

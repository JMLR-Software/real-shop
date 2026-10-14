import { describe, expect, it } from "vitest";
import { cookieOf, json, request } from "./helpers";

async function signUp(email: string): Promise<string> {
  const res = await request("/api/auth/sign-up/email", json({ name: "x", email, password: "a-long-enough-password" }));
  return cookieOf(res);
}

type Reply = { ok: boolean; data: { productId: string; qty: number }[]; error: string | null };
const reply = async (res: Response): Promise<Reply> => (await res.json()) as Reply;

// Note: the planted in-memory cart (a module-level Map) survives across the tests in this file.
describe("cart", () => {
  it("starts empty", async () => {
    const cookie = await signUp("a@example.com");
    const body = await reply(await request("/api/cart", { headers: { cookie } }));
    expect(body).toEqual({ ok: true, data: [], error: null });
  });

  it("adds, reads back across requests, removes", async () => {
    const cookie = await signUp("a@example.com");
    await request("/api/cart", json({ productId: "candle", qty: 2 }, cookie));
    await request("/api/cart", json({ productId: "wick", qty: 1 }, cookie));
    const read = await reply(await request("/api/cart", { headers: { cookie } }));
    expect(read.data.map((l) => [l.productId, l.qty])).toEqual([["candle", 2], ["wick", 1]]);
    const gone = await reply(await request("/api/cart/candle", { method: "DELETE", headers: { cookie } }));
    expect(gone.data.map((l) => l.productId)).toEqual(["wick"]);
  });

  it("rejects a bad quantity", async () => {
    const cookie = await signUp("a@example.com");
    const res = await request("/api/cart", json({ productId: "candle", qty: 0 }, cookie));
    expect(res.status).toBe(400);
    expect((await reply(res)).error).toBe("Quantity is a whole number from 1 to 99");
  });

  it("rejects an unknown product", async () => {
    const cookie = await signUp("a@example.com");
    const res = await request("/api/cart", json({ productId: "unicorn", qty: 1 }, cookie));
    expect(res.status).toBe(404);
  });

  // The planted bug: fails on main (one cart for everyone), passes on phase-1.
  it("is one cart per person", async () => {
    const ada = await signUp("ada@example.com");
    const bob = await signUp("bob@example.com");
    await request("/api/cart", json({ productId: "soap", qty: 1 }, ada));
    const bobs = await reply(await request("/api/cart", { headers: { cookie: bob } }));
    expect(bobs.data).toEqual([]);
  });
});

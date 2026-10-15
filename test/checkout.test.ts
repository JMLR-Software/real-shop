import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cookieOf, json, request } from "./helpers";

type Reply = { ok: boolean; data: unknown; error: string | null };
const reply = async (res: Response): Promise<Reply> => (await res.json()) as Reply;

async function signUpWithCart(): Promise<string> {
  const cookie = cookieOf(await request("/api/auth/sign-up/email", json({ name: "x", email: "a@example.com", password: "a-long-enough-password" })));
  await request("/api/cart", json({ productId: "candle", qty: 2 }, cookie));
  return cookie;
}

describe("checkout", () => {
  beforeAll(() => { fetchMock.activate(); fetchMock.disableNetConnect(); });
  afterEach(() => fetchMock.assertNoPendingInterceptors());

  it("needs a session", async () => {
    expect((await request("/api/checkout", json({}))).status).toBe(401);
  });

  it("refuses an empty cart", async () => {
    const cookie = cookieOf(await request("/api/auth/sign-up/email", json({ name: "x", email: "b@example.com", password: "a-long-enough-password" })));
    const res = await request("/api/checkout", json({}, cookie));
    expect(res.status).toBe(400);
    expect((await reply(res)).error).toBe("Your cart is empty");
  });

  it("makes a Stripe Checkout session from the cart and returns its url", async () => {
    const cookie = await signUpWithCart();
    let sent = "";
    fetchMock.get("https://api.stripe.com").intercept({ path: "/v1/checkout/sessions", method: "POST" })
      .reply(200, (opts) => { sent = String(opts.body); return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }; });
    const res = await request("/api/checkout", json({}, cookie));
    expect(res.status).toBe(200);
    expect((await reply(res)).data).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    // The snapshot the webhook will build the order from.
    const items = new URLSearchParams(sent).get("metadata[items]");
    expect(JSON.parse(items!)).toEqual([{ productId: "candle", qty: 2, priceCents: 1800 }]);
  });

  it("is a 502 when Stripe gives no checkout page", async () => {
    const cookie = await signUpWithCart();
    fetchMock.get("https://api.stripe.com").intercept({ path: "/v1/checkout/sessions", method: "POST" })
      .reply(200, { id: "cs_test_2", url: null });
    const res = await request("/api/checkout", json({}, cookie));
    expect(res.status).toBe(502);
    expect((await reply(res)).error).toBe("Stripe gave no checkout page");
  });
});

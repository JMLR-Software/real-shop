import { env } from "cloudflare:test";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { cookieOf, json, request } from "./helpers";

type Reply = { ok: boolean; data: unknown[]; error: string | null };
const reply = async (res: Response): Promise<Reply> => (await res.json()) as Reply;

const stripe = new Stripe("sk_test_fake", { httpClient: Stripe.createFetchHttpClient() });

async function signUpWithCart(email = "a@example.com") {
  const cookie = cookieOf(await request("/api/auth/sign-up/email", json({ name: "x", email, password: "a-long-enough-password" })));
  await request("/api/cart", json({ productId: "candle", qty: 2 }, cookie));
  const user = await env.DB.prepare(`select id from "user" where email = ?`).bind(email).first<{ id: string }>();
  return { cookie, userId: user!.id };
}

async function signed(event: object): Promise<RequestInit> {
  const payload = JSON.stringify(event);
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  return { method: "POST", headers: { "stripe-signature": signature, "content-type": "application/json" }, body: payload };
}

const completed = (userId: string, sessionId = "cs_test_1") => ({
  id: "evt_1", object: "event", type: "checkout.session.completed",
  data: { object: { id: sessionId, object: "checkout.session", client_reference_id: userId, payment_status: "paid" } },
});

describe("stripe webhook", () => {
  it("rejects a bad signature", async () => {
    const res = await request("/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=nope" }, body: "{}" });
    expect(res.status).toBe(400);
  });

  it("is 503 when the webhook secret is not set", async () => {
    const { default: worker } = await import("../worker/index");
    const { createExecutionContext } = await import("cloudflare:test");
    const res = await worker.fetch(new Request("http://shop.test/api/stripe/webhook", { method: "POST", body: "{}" }), { ...env, STRIPE_WEBHOOK_SECRET: undefined }, createExecutionContext());
    expect(res.status).toBe(503);
  });

  // The planted bug: fails on main (the webhook only logs), passes on phase-1.
  it("writes the order and empties the cart", async () => {
    const { cookie, userId } = await signUpWithCart();
    const res = await request("/api/stripe/webhook", await signed(completed(userId)));
    expect(res.status).toBe(200);
    const orders = await reply(await request("/api/orders", { headers: { cookie } }));
    expect(orders.data).toHaveLength(1);
    expect(orders.data[0]).toMatchObject({ stripeSessionId: "cs_test_1", amountCents: 3600, status: "paid" });
    const cart = await reply(await request("/api/cart", { headers: { cookie } }));
    expect(cart.data).toEqual([]);
  });

  // Stripe retries. Fails on main for the same reason as above.
  it("records the order once when delivered twice", async () => {
    const { cookie, userId } = await signUpWithCart();
    await request("/api/stripe/webhook", await signed(completed(userId)));
    await request("/api/stripe/webhook", await signed(completed(userId)));
    const orders = await reply(await request("/api/orders", { headers: { cookie } }));
    expect(orders.data).toHaveLength(1);
  });

  // The planted bug's other half: fails on main (the route exists), passes on phase-1.
  it("has no route that takes the client's word for a payment", async () => {
    const { cookie } = await signUpWithCart();
    const res = await request("/api/orders/confirm", json({ sessionId: "cs_test_anything" }, cookie));
    expect(res.status).toBe(404);
  });
});

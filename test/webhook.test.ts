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

const CANDLES = JSON.stringify([{ productId: "candle", qty: 2, priceCents: 1800 }]);

type SessionFields = { client_reference_id?: string | null; payment_status?: string; amount_total?: number | null; metadata?: Record<string, string> };

/** A Stripe event as it arrives: the snapshot checkout put in metadata, and what Stripe charged. */
const sessionEvent = (type: string, fields: SessionFields, sessionId = "cs_test_1") => ({
  id: "evt_1", object: "event", type,
  data: { object: { id: sessionId, object: "checkout.session", payment_status: "paid", amount_total: 3600, metadata: { items: CANDLES }, ...fields } },
});

const completed = (userId: string, fields: SessionFields = {}, sessionId = "cs_test_1") =>
  sessionEvent("checkout.session.completed", { client_reference_id: userId, ...fields }, sessionId);

const ordersOf = async (cookie: string) => (await reply(await request("/api/orders", { headers: { cookie } }))).data;
const cartOf = async (cookie: string) => (await reply(await request("/api/cart", { headers: { cookie } }))).data;

/** An ignored event writes nothing: no order, and the cart is as signUpWithCart left it. */
async function expectNothingWritten(cookie: string) {
  expect(await ordersOf(cookie)).toHaveLength(0);
  expect(await cartOf(cookie)).toHaveLength(1);
}

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

  it("records what Stripe charged, not the cart at delivery time", async () => {
    const { cookie, userId } = await signUpWithCart();
    await request("/api/cart/candle", { method: "DELETE", headers: { cookie } });
    await request("/api/cart", json({ productId: "soap", qty: 1 }, cookie));
    const res = await request("/api/stripe/webhook", await signed(completed(userId, { amount_total: 3650 })));
    expect(res.status).toBe(200);
    const orders = await ordersOf(cookie);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ amountCents: 3650 });
    const items = await env.DB.prepare(`select productId, qty, priceCents from order_item`).all();
    expect(items.results).toEqual([{ productId: "candle", qty: 2, priceCents: 1800 }]);
  });

  it("records the order even when the cart is already empty", async () => {
    const { cookie, userId } = await signUpWithCart();
    await env.DB.prepare(`delete from cart_item where userId = ?`).bind(userId).run();
    const res = await request("/api/stripe/webhook", await signed(completed(userId)));
    expect(res.status).toBe(200);
    expect(await ordersOf(cookie)).toHaveLength(1);
    const items = await env.DB.prepare(`select productId, qty from order_item`).all();
    expect(items.results).toEqual([{ productId: "candle", qty: 2 }]);
  });

  it("also records an order when the payment succeeds later", async () => {
    const { cookie, userId } = await signUpWithCart();
    const event = sessionEvent("checkout.session.async_payment_succeeded", { client_reference_id: userId });
    expect((await request("/api/stripe/webhook", await signed(event))).status).toBe(200);
    expect(await ordersOf(cookie)).toHaveLength(1);
  });

  it("answers 200 and writes nothing for a session without client_reference_id", async () => {
    const { cookie } = await signUpWithCart();
    const res = await request("/api/stripe/webhook", await signed(completed("", { client_reference_id: null })));
    expect(res.status).toBe(200);
    await expectNothingWritten(cookie);
  });

  it("answers 200 and writes nothing for another event type", async () => {
    const { cookie, userId } = await signUpWithCart();
    const res = await request("/api/stripe/webhook", await signed(sessionEvent("checkout.session.expired", { client_reference_id: userId })));
    expect(res.status).toBe(200);
    await expectNothingWritten(cookie);
  });

  it("answers 200 and writes nothing when payment_status is not paid", async () => {
    const { cookie, userId } = await signUpWithCart();
    const res = await request("/api/stripe/webhook", await signed(completed(userId, { payment_status: "unpaid" })));
    expect(res.status).toBe(200);
    await expectNothingWritten(cookie);
  });

  it("answers 200 and writes nothing for a session without an items snapshot", async () => {
    const { cookie, userId } = await signUpWithCart();
    const res = await request("/api/stripe/webhook", await signed(completed(userId, { metadata: {} })));
    expect(res.status).toBe(200);
    await expectNothingWritten(cookie);
  });

  // The planted bug's other half: fails on main (the route exists), passes on phase-1.
  it("has no route that takes the client's word for a payment", async () => {
    const { cookie } = await signUpWithCart();
    const res = await request("/api/orders/confirm", json({ sessionId: "cs_test_anything" }, cookie));
    expect(res.status).toBe(404);
  });
});

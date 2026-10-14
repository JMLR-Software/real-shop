import { Hono } from "hono";
import type Stripe from "stripe";
import { cartTotalCents } from "../cart-rules";
import type { Env } from "../env";
import { ConfigError, fail, ok } from "../envelope";
import { logEvent } from "../log";
import { parseOrderItems, recordOrder } from "../orders";
import { cryptoProvider, stripeFor } from "../stripe";

export const webhook = new Hono<{ Bindings: Env }>();

webhook.post("/", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) throw new ConfigError("STRIPE_WEBHOOK_SECRET is not set");
  const signature = c.req.header("stripe-signature") ?? "";
  const payload = await c.req.text();
  let event: Stripe.Event;
  try {
    event = await stripeFor(c.env).webhooks.constructEventAsync(payload, signature, c.env.STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider());
  } catch {
    return fail(c, "Bad signature", 400);
  }
  // Every event we do not act on still gets a 200: Stripe retries anything else for days.
  const ignore = (reason: string) => {
    logEvent("webhook_ignored", { id: event.id, type: event.type, reason });
    return ok(c, { received: true });
  };
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return ignore("other event type");
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") return ignore("not paid");
  const userId = session.client_reference_id;
  if (!userId) return ignore("no client_reference_id");
  const items = parseOrderItems(session.metadata?.items);
  if (!items) return ignore("no items snapshot");
  const amountCents = session.amount_total ?? cartTotalCents(items.map((i) => ({ ...i, name: i.productId })));
  // The write happens before the 200. If it throws, Stripe gets a 500 and retries, and
  // recordOrder's check on the session id makes the retry harmless.
  const outcome = await recordOrder(c.env.DB, userId, session.id, items, amountCents, Date.now());
  logEvent("order_recorded", { userId, sessionId: session.id, outcome, amountFromStripe: session.amount_total !== null });
  return ok(c, { received: true });
});

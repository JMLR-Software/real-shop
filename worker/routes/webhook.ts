import { Hono } from "hono";
import type Stripe from "stripe";
import type { Env } from "../env";
import { ConfigError, fail, ok } from "../envelope";
import { logEvent } from "../log";
import { recordOrder } from "../orders";
import { cryptoProvider, stripeFor } from "../stripe";

export const webhook = new Hono<{ Bindings: Env }>();

webhook.post("/", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) throw new ConfigError("STRIPE_WEBHOOK_SECRET is not set");
  const signature = c.req.header("stripe-signature") ?? "";
  const payload = await c.req.text();
  let event;
  try {
    event = await stripeFor(c.env).webhooks.constructEventAsync(payload, signature, c.env.STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider());
  } catch {
    return fail(c, "Bad signature", 400);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    if (!userId) return fail(c, "No client_reference_id on the session", 400);
    // The write happens before the 200. If it throws, Stripe gets a 500 and retries, and
    // recordOrder's check on the session id makes the retry harmless.
    const outcome = await recordOrder(c.env.DB, userId, session.id, Date.now());
    logEvent("order_recorded", { userId, sessionId: session.id, outcome });
  }
  return ok(c, { received: true });
});

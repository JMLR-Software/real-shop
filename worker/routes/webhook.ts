import { Hono } from "hono";
import type { Env } from "../env";
import { ConfigError, fail, ok } from "../envelope";
import { logEvent } from "../log";
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
  // PLANTED BUG (phase 1): Stripe is telling us the money arrived, and we only write it down in
  // the log. The order gets written by /api/orders/confirm, on the browser's word, instead.
  logEvent("stripe_event", { type: event.type, id: event.id });
  return ok(c, { received: true });
});

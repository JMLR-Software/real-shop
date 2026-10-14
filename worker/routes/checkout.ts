import { Hono } from "hono";
import { requireSession, type App } from "../auth";
import { fail, ok } from "../envelope";
import { logEvent } from "../log";
import { cartTotalCents } from "../cart-rules";
import { cartLines } from "../orders";
import { stripeFor } from "../stripe";

export const checkout = new Hono<App>();
checkout.use("*", requireSession);

checkout.post("/", async (c) => {
  const userId = c.var.session.user.id;
  const items = await cartLines(c.env.DB, userId);
  if (items.length === 0) return fail(c, "Your cart is empty", 400);
  const session = await stripeFor(c.env).checkout.sessions.create({
    mode: "payment",
    client_reference_id: userId,
    line_items: items.map((l) => ({
      quantity: l.qty,
      price_data: { currency: "usd", unit_amount: l.priceCents, product_data: { name: l.name } },
    })),
    success_url: `${c.env.SITE_URL}/checkout/done/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${c.env.SITE_URL}/cart/`,
    // The order is built from this snapshot, not from the cart at delivery time. Stripe caps a metadata value at 500 characters; three products never reach it.
    metadata: { items: JSON.stringify(items.map(({ productId, qty, priceCents }) => ({ productId, qty, priceCents }))) },
  });
  if (!session.url) return fail(c, "Stripe gave no checkout page", 502);
  logEvent("checkout_started", { userId, sessionId: session.id, amountCents: cartTotalCents(items) });
  return ok(c, { url: session.url });
});

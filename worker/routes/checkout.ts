import { Hono } from "hono";
import { requireSession, type App } from "../auth";
import { fail, ok } from "../envelope";
import { logEvent } from "../log";
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
  });
  logEvent("checkout_started", { userId, sessionId: session.id, amountCents: items.reduce((s, l) => s + l.priceCents * l.qty, 0) });
  return ok(c, { url: session.url });
});

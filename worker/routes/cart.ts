import { Hono } from "hono";
import { requireSession, type App } from "../auth";
import { fail, ok } from "../envelope";
import { parseCartChange } from "../cart-rules";
import { cartLines } from "../orders";

// The cart is rows in D1, keyed to the person. Every copy of the Worker sees the same rows.
export const cart_ = new Hono<App>();
cart_.use("*", requireSession);

cart_.get("/", async (c) => ok(c, await cartLines(c.env.DB, c.var.session.user.id)));

cart_.post("/", async (c) => {
  const change = parseCartChange(await c.req.json().catch(() => null));
  if ("error" in change) return fail(c, change.error, 400);
  const exists = await c.env.DB.prepare(`select 1 from product where id = ?`).bind(change.productId).first();
  if (!exists) return fail(c, "No such product", 404);
  const userId = c.var.session.user.id;
  await c.env.DB.prepare(
    `insert into cart_item (userId, productId, qty, updatedAt) values (?, ?, ?, ?)
     on conflict (userId, productId) do update set qty = excluded.qty, updatedAt = excluded.updatedAt`,
  ).bind(userId, change.productId, change.qty, Date.now()).run();
  return ok(c, await cartLines(c.env.DB, userId));
});

cart_.delete("/:productId", async (c) => {
  const userId = c.var.session.user.id;
  await c.env.DB.prepare(`delete from cart_item where userId = ? and productId = ?`).bind(userId, c.req.param("productId")).run();
  return ok(c, await cartLines(c.env.DB, userId));
});

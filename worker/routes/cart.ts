import { Hono, type Context } from "hono";
import { requireSession, type App } from "../auth";
import { fail, ok } from "../envelope";
import { parseCartChange, type CartLine } from "../cart-rules";

// PLANTED BUG (phase 1): the cart lives in this variable. It is one cart for every shopper,
// and every copy of this Worker has its own, and it is empty again whenever a copy restarts.
// The lesson: the app forgets everything between visits; the database remembers.
const cart = new Map<string, number>();

async function lines(c: Context<App>): Promise<CartLine[]> {
  if (cart.size === 0) return [];
  const ids = [...cart.keys()];
  const { results } = await c.env.DB.prepare(
    `select id as productId, name, priceCents from product where id in (${ids.map(() => "?").join(",")})`,
  ).bind(...ids).all<{ productId: string; name: string; priceCents: number }>();
  return results.map((p) => ({ ...p, qty: cart.get(p.productId) ?? 0 }));
}

export const cart_ = new Hono<App>();
cart_.use("*", requireSession);

cart_.get("/", async (c) => ok(c, await lines(c)));

cart_.post("/", async (c) => {
  const change = parseCartChange(await c.req.json().catch(() => null));
  if ("error" in change) return fail(c, change.error, 400);
  const exists = await c.env.DB.prepare(`select 1 from product where id = ?`).bind(change.productId).first();
  if (!exists) return fail(c, "No such product", 404);
  cart.set(change.productId, change.qty);
  return ok(c, await lines(c));
});

cart_.delete("/:productId", async (c) => {
  cart.delete(c.req.param("productId"));
  return ok(c, await lines(c));
});

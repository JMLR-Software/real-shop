import { Hono } from "hono";
import type { Env } from "../env";
import { ok } from "../envelope";

export const products = new Hono<{ Bindings: Env }>();

products.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `select id, name, priceCents, blurb from product order by rowid`,
  ).all();
  return ok(c, results);
});

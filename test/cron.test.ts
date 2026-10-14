import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { clearOldCarts, ONE_DAY_MS } from "../worker/jobs/clear-carts";

// SELF's type comes from the default export, which has no `scheduled` on main; the pool still provides it.
type Scheduled = { scheduled(opts: { cron: string }): Promise<{ outcome: string }> };

async function seedCart(email: string, updatedAt: number) {
  await env.DB.prepare(`insert into "user" (id, name, email, emailVerified, createdAt, updatedAt) values (?, 'x', ?, 0, 0, 0)`).bind(email, email).run();
  await env.DB.prepare(`insert into cart_item (userId, productId, qty, updatedAt) values (?, 'candle', 1, ?)`).bind(email, updatedAt).run();
}

describe("clearOldCarts", () => {
  it("deletes carts older than a day and keeps the rest", async () => {
    const now = 1_700_000_000_000;
    await seedCart("old@example.com", now - ONE_DAY_MS - 1);
    await seedCart("new@example.com", now - 1000);
    expect(await clearOldCarts(env.DB, now)).toBe(1);
    const left = await env.DB.prepare(`select userId from cart_item`).all();
    expect(left.results.map((r) => r.userId)).toEqual(["new@example.com"]);
  });

  // The planted bug: fails on main (no scheduled handler), passes on phase-1.
  it("runs from the Cron Trigger", async () => {
    await seedCart("old@example.com", 0);
    const result = await (SELF as unknown as Scheduled).scheduled({ cron: "0 3 * * *" });
    expect(result.outcome).toBe("ok");
    const left = await env.DB.prepare(`select count(*) as n from cart_item`).first<{ n: number }>();
    expect(left!.n).toBe(0);
  });
});

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Carts nobody touched for a day are abandoned; the nightly job removes them. */
export async function clearOldCarts(db: D1Database, now: number): Promise<number> {
  const res = await db.prepare(`delete from cart_item where updatedAt < ?`).bind(now - ONE_DAY_MS).run();
  return res.meta.changes;
}

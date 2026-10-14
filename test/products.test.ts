import { describe, expect, it } from "vitest";
import { request } from "./helpers";

describe("products", () => {
  it("health answers in the envelope", async () => {
    const res = await request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { up: true }, error: null });
  });

  it("lists the five seeded products", async () => {
    const body = (await (await request("/api/products")).json()) as {
      ok: boolean;
      data: { id: string; name: string; priceCents: number; blurb: string }[];
    };
    expect(body.ok).toBe(true);
    expect(body.data.map((p) => p.id)).toEqual(["candle", "wick", "soap", "jar", "matches"]);
    expect(body.data[0]).toMatchObject({
      id: "candle",
      name: "Beeswax candle",
      priceCents: 1800,
      blurb: "Burns for forty hours.",
    });
    for (const p of body.data) {
      expect(Number.isInteger(p.priceCents) && p.priceCents > 0).toBe(true);
    }
  });

  it("unknown routes answer 404 in the envelope", async () => {
    const res = await request("/api/nothing");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, data: null, error: "No such route" });
  });
});

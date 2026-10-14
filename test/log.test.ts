import { fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cookieOf, json, request } from "./helpers";

describe("logs", () => {
  beforeAll(() => { fetchMock.activate(); fetchMock.disableNetConnect(); });
  afterEach(() => { vi.restoreAllMocks(); fetchMock.assertNoPendingInterceptors(); });

  // The planted bug: fails on main, passes on phase-1.
  it("never writes the session cookie to the log", async () => {
    const cookie = cookieOf(await request("/api/auth/sign-up/email", json({ name: "x", email: "a@example.com", password: "a-long-enough-password" })));
    await request("/api/cart", json({ productId: "candle", qty: 1 }, cookie));
    fetchMock.get("https://api.stripe.com").intercept({ path: "/v1/checkout/sessions", method: "POST" }).reply(200, { id: "cs_test_1", url: "https://checkout.stripe.com/x" });
    const log = vi.spyOn(console, "log");
    await request("/api/checkout", json({}, cookie));
    const token = cookie.split("=")[1].split(".")[0];
    for (const call of log.mock.calls) expect(JSON.stringify(call)).not.toContain(token);
  });
});

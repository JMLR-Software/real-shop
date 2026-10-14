import { describe, expect, it } from "vitest";
import { assertTestKey } from "../../worker/stripe";

describe("assertTestKey", () => {
  it("returns a test key", () => expect(assertTestKey("sk_test_abc")).toBe("sk_test_abc"));
  it("refuses a live key", () => expect(() => assertTestKey("sk_live_abc")).toThrow("Refusing to run: STRIPE_SECRET_KEY is not a test key"));
  it("refuses no key", () => expect(() => assertTestKey(undefined)).toThrow("STRIPE_SECRET_KEY is not set"));
});

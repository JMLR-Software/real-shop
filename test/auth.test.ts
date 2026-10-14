import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { cookieOf, json, request } from "./helpers";

const person = { name: "Ada", email: "ada@example.com", password: "a-long-enough-password" };

describe("sign-in", () => {
  it("is 401 with no session", async () => {
    const res = await request("/api/cart");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, data: null, error: "Not signed in" });
  });

  it("signs up, then the cart answers 200", async () => {
    const up = await request("/api/auth/sign-up/email", json(person));
    expect(up.status).toBe(200);
    const res = await request("/api/cart", { headers: { cookie: cookieOf(up) } });
    expect(res.status).toBe(200);
  });

  it("wrong password is 401", async () => {
    await request("/api/auth/sign-up/email", json(person));
    const res = await request("/api/auth/sign-in/email", json({ email: person.email, password: "nope-nope-nope" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, data: null, error: "Wrong email or password" });
  });

  it("duplicate sign-up is 422 with a plain message", async () => {
    await request("/api/auth/sign-up/email", json(person));
    const res = await request("/api/auth/sign-up/email", json(person));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, data: null, error: "That email already has an account" });
  });

  it("sign-up answers in the envelope and still sets the cookie", async () => {
    const res = await request("/api/auth/sign-up/email", json(person));
    const body = (await res.json()) as { ok: boolean; data: { user: { email: string } } };
    expect(body.ok).toBe(true);
    expect(body.data.user.email).toBe(person.email);
    expect(() => cookieOf(res)).not.toThrow();
  });

  it("signs out, then 401 again", async () => {
    const up = await request("/api/auth/sign-up/email", json(person));
    const cookie = cookieOf(up);
    await request("/api/auth/sign-out", {
      method: "POST",
      // A browser always sends Origin on a POST; Better Auth 403s a cookie-carrying POST without one.
      headers: { cookie, origin: "http://shop.test" },
    });
    const res = await request("/api/cart", { headers: { cookie } });
    expect(res.status).toBe(401);
  });

  // The planted bug: fails on main, passes on phase-1.
  it("refuses to run without BETTER_AUTH_SECRET", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("http://shop.test/api/auth/sign-up/email", json(person)),
      { ...env, BETTER_AUTH_SECRET: undefined },
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, data: null, error: "BETTER_AUTH_SECRET is not set" });
  });
});

import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { createAuth, type App } from "./auth";
import type { Env } from "./env";
import { ConfigError, fail, ok } from "./envelope";
import { logEvent } from "./log";
import { cart_ } from "./routes/cart";
import { products } from "./routes/products";

const app = new Hono<App>();

app.use("/api/*", async (c, next) => {
  c.set("auth", createAuth(c.env));
  await next();
});

app.get("/api/health", (c) => ok(c, { up: true }));
app.route("/api/products", products);
app.route("/api/cart", cart_);

// Better Auth's own routes. Every reply is rewrapped into the envelope so the browser never sees its raw body.
const AUTH_ERRORS: Record<number, string> = {
  400: "Check the email and password",
  403: "Request blocked: wrong origin",
  422: "That email already has an account",
  429: "Too many tries; wait a minute",
};

function authErrorMessage(status: number, path: string): string {
  if (status === 401) {
    const isCredentialPath = path.startsWith("/api/auth/sign-in/") || path.startsWith("/api/auth/sign-up/");
    return isCredentialPath ? "Wrong email or password" : "Not signed in";
  }
  return AUTH_ERRORS[status] ?? "Something went wrong";
}

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const res = await c.var.auth.handler(c.req.raw);
  if (!res.ok) return fail(c, authErrorMessage(res.status, c.req.path), res.status as ContentfulStatusCode);
  // Built by hand, not c.json, so Better Auth's Set-Cookie header survives.
  const text = await res.text();
  const headers = new Headers(res.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  const data = text ? JSON.parse(text) : null;
  return new Response(JSON.stringify({ ok: true, data, error: null }), { status: res.status, headers });
});

app.notFound((c) => fail(c, "No such route", 404));

app.onError((err, c) => {
  if (err instanceof ConfigError) {
    logEvent("config_error", { message: err.message });
    return fail(c, err.message, 503);
  }
  logEvent("unhandled", { method: c.req.method, path: c.req.path, message: err.message });
  return fail(c, "Something went wrong", 500);
});

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;

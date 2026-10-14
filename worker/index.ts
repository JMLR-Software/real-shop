import { Hono } from "hono";
import { createAuth, requireSession, type App } from "./auth";
import type { Env } from "./env";
import { ConfigError, fail, ok } from "./envelope";
import { logEvent } from "./log";
import { products } from "./routes/products";

const app = new Hono<App>();

app.use("/api/*", async (c, next) => {
  c.set("auth", createAuth(c.env));
  await next();
});

app.get("/api/health", (c) => ok(c, { up: true }));
app.route("/api/products", products);

// Better Auth's own routes. Its errors are rewrapped so the browser never sees its raw body.
app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const res = await c.var.auth.handler(c.req.raw);
  if (res.status === 401 || res.status === 400) {
    return fail(c, res.status === 401 ? "Wrong email or password" : "Check the email and password", res.status);
  }
  return res;
});

// A placeholder cart so sign-in is testable now; Task 4 replaces it.
app.get("/api/cart", requireSession, (c) => ok(c, []));

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

import { Hono } from "hono";
import type { Env } from "./env";
import { ConfigError, fail, ok } from "./envelope";
import { logEvent } from "./log";
import { products } from "./routes/products";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => ok(c, { up: true }));
app.route("/api/products", products);

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

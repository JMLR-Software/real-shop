import { betterAuth } from "better-auth";
import type { MiddlewareHandler } from "hono";
import type { Env } from "./env";
import { ConfigError, fail } from "./envelope";

// Better Auth takes the D1 binding directly (its Kysely adapter detects D1), so no ORM.
// Bindings only exist per request on Workers, so the instance is built per request.
export function createAuth(env: Env) {
  // Fail at the first request, naming the binding, instead of running on the public default.
  if (!env.BETTER_AUTH_SECRET) throw new ConfigError("BETTER_AUTH_SECRET is not set");
  return betterAuth({
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    // No email on the free plan, so no verification step. A later phase adds it.
    emailAndPassword: { enabled: true, requireEmailVerification: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
export type App = { Bindings: Env; Variables: { auth: Auth; session: Session } };

export const requireSession: MiddlewareHandler<App> = async (c, next) => {
  const session = await c.var.auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return fail(c, "Not signed in", 401);
  c.set("session", session);
  await next();
};

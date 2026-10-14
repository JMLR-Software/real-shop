import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type Envelope<T> = { ok: boolean; data: T | null; error: string | null };

export const ok = <T>(c: Context, data: T, status: ContentfulStatusCode = 200) =>
  c.json({ ok: true, data, error: null } satisfies Envelope<T>, status);

export const fail = (c: Context, error: string, status: ContentfulStatusCode) =>
  c.json({ ok: false, data: null, error } satisfies Envelope<never>, status);

/** A missing or wrong binding. The route answers 503 and names the binding, never the value. */
export class ConfigError extends Error {}

import { SELF } from "cloudflare:test";

export const request = (path: string, init?: RequestInit): Promise<Response> =>
  SELF.fetch(`http://shop.test${path}`, init);

export const json = (body: unknown, cookie?: string, method = "POST"): RequestInit => ({
  method,
  headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});

/** The Better Auth session cookie from a sign-up or sign-in response, for later requests. */
export const cookieOf = (res: Response): string => {
  const set = res.headers.get("set-cookie") ?? "";
  const m = set.match(/better-auth\.session_token=([^;]+)/);
  if (!m) throw new Error("no better-auth.session_token cookie set");
  return `better-auth.session_token=${m[1]}`;
};

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    FILES: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
    BETTER_AUTH_URL: string;
    SITE_URL: string;
    BETTER_AUTH_SECRET: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
  }
}

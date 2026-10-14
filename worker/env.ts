export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  BETTER_AUTH_URL: string;
  SITE_URL: string;
  BETTER_AUTH_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

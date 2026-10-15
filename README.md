# real-shop

A small shop that uses what Cloudflare's free plan offers, end to end: a Next.js site and an API
in one Worker, sign-in (Better Auth), the database (D1), file uploads (R2), a nightly job (Cron
Triggers), logs, and Stripe Checkout with its webhook. Staging and production each have their own
database and bucket. The courses take their examples from it.

A copy with a bug planted in each feature, for a possible fix-it exercise, is parked on the
`practice` branch.

## Run it

    pnpm install
    cp .dev.vars.example .dev.vars   # fill in your own test values
    pnpm db:migrate:local
    pnpm dev                          # builds the site, serves site + API at http://localhost:8787

## Test it

    pnpm test        # unit tests, then the Worker tests in Cloudflare's runtime
    pnpm e2e         # the whole flow in a browser, through Stripe's test card; needs the two lines below
    pnpm smoke [base-url]   # health, sign-up, cart, checkout, a triggered payment, the order; default http://localhost:8787

The end-to-end test and the smoke script talk to real Stripe, in test mode. Once, before the first run:

1. In the Stripe dashboard, test mode, Developers → API keys: copy the secret key (`sk_test_...`)
   into `STRIPE_SECRET_KEY` in `.dev.vars`.
2. Install the Stripe CLI and run `stripe login`.
3. `pnpm exec playwright install chromium` for the end-to-end test's browser.

Then, every time, in two terminals:

    stripe listen --forward-to localhost:8787/api/stripe/webhook   # prints a whsec_...; put it in .dev.vars as STRIPE_WEBHOOK_SECRET
    pnpm dev                                                        # start (or restart) after .dev.vars has the whsec_

If the CLI is logged into more than one Stripe account, use the account the `sk_test_` key came from:
`stripe listen --project-name "<profile>"` and `STRIPE_PROJECT="<profile>" pnpm smoke`
(`stripe config --list` shows the profiles). If port 8787 is taken, run everything on another one:
`pnpm build && wrangler dev --port 8799 --local-upstream localhost:8799 --var BETTER_AUTH_URL:http://localhost:8799 --var SITE_URL:http://localhost:8799`,
then `E2E_URL=http://localhost:8799 pnpm e2e` and `pnpm smoke http://localhost:8799`.

Last green run against live Stripe: 2026-10-14. Stripe's hosted page changes; if `pnpm e2e` stops
at the card form, the field ids in `e2e/checkout.spec.ts` are the first thing to check.

Deploys: GitHub Actions, on push, after the tests pass. `main` → production; `staging` → staging.

### Set it up once, on your own accounts

1. Cloudflare dashboard: turn on R2 (R2 Object Storage, then enable). It asks for a payment
   method even on the free plan. Until then every R2 command fails with code 10042.
2. Make the databases and buckets, then paste the two `database_id` values into `wrangler.jsonc`:

       pnpm exec wrangler d1 create real-shop-staging
       pnpm exec wrangler d1 create real-shop-production
       pnpm exec wrangler r2 bucket create real-shop-files-staging
       pnpm exec wrangler r2 bucket create real-shop-files-production

3. A Cloudflare API token for GitHub Actions: My Profile, API Tokens, the "Edit Cloudflare
   Workers" template, plus D1 Edit, and for a custom domain Zone Read and DNS Edit on that zone. Save it and your account id (`pnpm exec wrangler whoami`) as
   the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Secrets on each Worker, a different `BETTER_AUTH_SECRET` for each (`openssl rand -base64 32`):

       pnpm exec wrangler secret put BETTER_AUTH_SECRET --env staging
       pnpm exec wrangler secret put STRIPE_SECRET_KEY --env staging     # sk_test_ only
       # the same two with --env production

   The first `secret put` offers to create the Worker: answer yes.

5. Push. Then in Stripe (test mode), Workbench, Webhooks (event destinations): one endpoint per environment,
   `https://<your address>/api/stripe/webhook`, event `checkout.session.completed`. Put each
   endpoint's signing secret in with `wrangler secret put STRIPE_WEBHOOK_SECRET --env <env>`.

Production answers on the custom domain in `wrangler.jsonc`'s `routes`. Change it to a domain on
your own Cloudflare account, or delete `routes` and set `workers_dev` to true. Then change
`BETTER_AUTH_URL` and `SITE_URL` in both environments to your own addresses (staging lives on
your account's `workers.dev` subdomain). Sign-in and Stripe's return pages use them.

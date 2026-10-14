# real-shop

The practice app for "The hard three" (sign-in, the database, payments), on Cloudflare's free
plan. `main` is phase 1 **with every planted bug** (tag `phase-1-broken`): the cart forgets, the
order is written on the redirect, the upload vanishes, the nightly job never runs, the log leaks,
staging shares production's database, the sign-in secret is never checked. Branch `phase-1` fixes
one room per commit. Tag `phase-0` is the starter the escape plan's lesson 2 makes.

## Run it

    pnpm install
    cp .dev.vars.example .dev.vars   # fill in your own test values
    pnpm db:migrate:local
    pnpm dev                          # builds the site, serves site + API at http://localhost:8787

## Test it

    pnpm test        # on main this is red on purpose; see the list below
    pnpm e2e         # needs a real Stripe test key in .dev.vars and `pnpm dev` running
    pnpm smoke [base-url]   # health, sign-up, cart, checkout, then `stripe trigger`; default http://localhost:8787

The end-to-end flow has not yet been run against a live Stripe test key (as of 2026-10-14). It needs `.dev.vars` with `sk_test_` and `whsec_`, `pnpm dev`, and `stripe listen --forward-to localhost:8787/api/stripe/webhook`.

### Red on `main`, on purpose

Each line is a planted bug. The `phase-1` branch fixes them, one commit per bug.

- auth: `refuses to run without BETTER_AUTH_SECRET`
- cart: `is one cart per person`
- cart-actions (unit): `does not say Added when the API failed`
- checkout: `makes a Stripe Checkout session from the cart and returns its url`
- webhook: `writes the order and empties the cart`
- webhook: `records the order once when delivered twice`
- webhook: `has no route that takes the client's word for a payment`
- upload: `puts the bytes in R2`
- cron: `runs from the Cron Trigger`
- log: `never writes the session cookie to the log`
- wrangler-envs (unit): `gives each environment its own database and bucket`

Deploys: GitHub Actions, on push. `main` → production (the broken shop readers fork);
`phase-1` → staging (the fixed shop).

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

   The first `secret put` offers to create the Worker: answer yes. Only `phase-1` deploys
   staging, so on `main` the staging steps can wait.

5. Push. Then in Stripe (test mode), Workbench, Webhooks (event destinations): one endpoint per environment,
   `https://<your address>/api/stripe/webhook`, event `checkout.session.completed`. Put each
   endpoint's signing secret in with `wrangler secret put STRIPE_WEBHOOK_SECRET --env <env>`.

Production answers on the custom domain in `wrangler.jsonc`'s `routes`. Change it to a domain on
your own Cloudflare account, or delete `routes` and set `workers_dev` to true. Then change
`BETTER_AUTH_URL` and `SITE_URL` in both environments to your own addresses (staging lives on
your account's `workers.dev` subdomain). Sign-in and Stripe's return pages use them.

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

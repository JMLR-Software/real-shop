# hard-three-shop

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

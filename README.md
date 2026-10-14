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

    pnpm test        # on main this is red on purpose; see the table in CLAUDE.md's course notes
    pnpm e2e         # needs a real Stripe test key in .dev.vars and `pnpm dev` running

Deploys: GitHub Actions, on push. `main` → production (the broken shop readers fork);
`phase-1` → staging (the fixed shop).

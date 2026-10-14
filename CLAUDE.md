# hard-three-shop

A small shop on Cloudflare Workers: a Next.js static site in `src/`, an API in `worker/`, the
database in D1, files in R2. The practice app for the bridge's paid courses.

## Rules for code that runs on Cloudflare Workers

1. **Nothing is kept in memory between requests.** No module-level variables that hold data (a
   cart, a session, a counter, a file). Many copies of this app run at once and each restarts
   whenever it likes. Data goes in D1; files go in R2.
2. **There is no server to start.** Never `app.listen`, never Express, never a port. The Worker
   exports `{ fetch, scheduled }` and Cloudflare calls them.
3. **There is no disk.** Never `fs`, never `./uploads/`. Files go in the R2 bucket `FILES`.
4. **Nothing at the top of a file needs a request.** No `crypto.randomUUID()`, `fetch`, `Date.now()`
   or timers in module scope; it crashes the Worker at start with "Disallowed operation called
   within global scope". Do those inside a handler.
5. **Scheduled work is a Cron Trigger**, the `scheduled` export and `triggers.crons` in
   `wrangler.jsonc`. Never `setInterval`; the isolate it runs in is gone within seconds.
6. **Secrets come from bindings.** `wrangler secret put NAME --env <env>` live, `.dev.vars`
   locally (gitignored). Never in code, never in `wrangler.jsonc`, never logged. Use
   `pbpaste | wrangler secret put NAME --env staging`: a bare put in a no-TTY shell uploads an
   empty value.
7. **Build the auth per request** (`createAuth(c.env)`): bindings exist only per request.
8. **Every `/api/*` reply is the envelope** `{ ok, data, error }`: `ok(c, data)` and `fail(c, message, status)` from `worker/envelope.ts`. Never a stack trace to the browser.
9. **Log one line per event with `logEvent(name, fields)`**, never a request, headers, cookies or a body.
10. **Stripe is test mode only.** The Worker refuses a key that does not start with `sk_test_`.
11. **Migrations are append-only** `migrations/NNNN_*.sql`; never edit one that has been applied.
12. `pnpm dev` runs `wrangler dev --local-upstream localhost:8787`; without that flag wrangler
    rewrites `Origin` and Better Auth answers 403 `INVALID_ORIGIN`.
13. `pnpm`, never `npm` or `npx`.

## Layout

- `src/app/` pages, `src/content/site.ts` every word, `src/lib/api.ts` the fetch wrapper.
- `worker/index.ts` wires routes; `worker/routes/*` parse and call; pure rules in `worker/*.ts`.
- `migrations/` D1 schema; `test/` Workers-pool tests; `test/unit/` node tests; `e2e/` Playwright.

## Commands

`pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm db:migrate:local`. Deploys happen from GitHub
Actions on push, never `wrangler deploy` by hand.

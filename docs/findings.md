# Findings

One dated line per surprise: what a doc said versus what happened, a limit hit, an assumption that was wrong.

- 2026-10-13: `next build` rewrote `tsconfig.json` on first run (`jsx` set to `react-jsx`, `.next/dev/types/**/*.ts` added to `include`); the brief's `jsx: preserve` is not what Next 16 keeps. The rewritten file is committed.
- 2026-10-13: Port 8787 was already taken on this machine (another workerd), so the `wrangler dev` check ran on port 8799; with the brief's `--port 8787` the Workers runtime fails with "Address already in use" and curl hits the other server. No login was asked for.
- 2026-10-13: Versions in the brief installed as written (Next 16.3.4, React 19.2.8); wrangler resolved to 4.150.0.
- 2026-10-13: `pnpm add -D @cloudflare/vitest-pool-workers vitest` resolved to pool 0.23.0 plus vitest 5.0.4. 0.23.0 is deprecated ("renamed to @cloudflare/vitest-plugin") and has no `./config` export, so `defineWorkersConfig` and `readD1Migrations` do not exist. Pinned to the line sameboat uses: pool `^0.12.21`, vitest `^3.2.7`, `@vitest/coverage-istanbul` `^3.2.7` (the brief's config shape works there). The pool itself is also marked deprecated on 0.12.21.
- 2026-10-13: `@cloudflare/workers-types` 5.x has no dated entry points, so `types: ["@cloudflare/workers-types/2023-07-01"]` fails with TS2688. `tsconfig.worker.json` uses `@cloudflare/workers-types`.
- 2026-10-13: `ContentfulStatusCode` exists in `hono/utils/http-status` (Hono 4.13.13); no substitute was needed.
- 2026-10-13: Miniflare warns "latest compatibility date supported by the installed Cloudflare Workers Runtime is 2026-03-10, but you've requested 2026-10-01. Falling back" during tests (pool 0.12.21 bundles an older workerd). Harmless; `database_id: "local"` was accepted as is.
- 2026-10-13: `vitest run` exits 1 on "No test files found", which broke `pnpm test` (unit config is empty until Task 4). Added `--passWithNoTests` to `test` and `test:unit`.
- 2026-10-13: `res.json()` is `unknown` under vitest 3 types, so the products test casts the body to `{ ok: boolean; data: { id: string }[] }` to typecheck.

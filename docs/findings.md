# Findings

One dated line per surprise: what a doc said versus what happened, a limit hit, an assumption that was wrong.

- 2026-10-13: `next build` rewrote `tsconfig.json` on first run (`jsx` set to `react-jsx`, `.next/dev/types/**/*.ts` added to `include`); the brief's `jsx: preserve` is not what Next 16 keeps. The rewritten file is committed.
- 2026-10-13: Port 8787 was already taken on this machine (another workerd), so the `wrangler dev` check ran on port 8799; with the brief's `--port 8787` the Workers runtime fails with "Address already in use" and curl hits the other server. No login was asked for.
- 2026-10-13: Versions in the brief installed as written (Next 16.3.4, React 19.2.8); wrangler resolved to 4.150.0.

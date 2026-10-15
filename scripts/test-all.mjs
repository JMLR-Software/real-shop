// Chaining the two halves with && would stop at the first failure and hide the rest, so run
// both, always, and fail if either failed.
import { spawnSync } from "node:child_process";

const run = (args) => spawnSync("pnpm", ["exec", "vitest", "run", ...args], { stdio: "inherit" }).status ?? 1;

const unit = run(["--config", "vitest.unit.config.ts"]);
const worker = run([]);
process.exit(unit !== 0 || worker !== 0 ? 1 : 0);

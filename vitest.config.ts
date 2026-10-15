import { mkdirSync } from "node:fs";
import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  // wrangler.jsonc serves the site from out/, and the pool refuses to start if it is missing.
  // The tests never fetch the site, so an empty folder is enough; a fresh clone need not build first.
  mkdirSync(path.join(__dirname, "out"), { recursive: true });
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  return {
    test: {
      include: ["test/**/*.test.ts"],
      exclude: ["test/unit/**"],
      setupFiles: ["./test/apply-migrations.ts"],
      coverage: {
        provider: "istanbul" as const,
        include: ["worker/**/*.ts"],
        thresholds: { lines: 80, functions: 80 },
      },
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            // The pool's bundled workerd supports dates up to 2026-03-10, so tests run on that date; production runs on wrangler.jsonc's.
            compatibilityDate: "2026-03-10",
            bindings: {
              TEST_MIGRATIONS: migrations,
              BETTER_AUTH_URL: "http://shop.test",
              BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-better-auth",
              STRIPE_SECRET_KEY: "sk_test_fake",
              STRIPE_WEBHOOK_SECRET: "whsec_test_fake",
            },
          },
        },
      },
    },
  };
});

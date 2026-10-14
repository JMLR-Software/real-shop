import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
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
            bindings: {
              TEST_MIGRATIONS: migrations,
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

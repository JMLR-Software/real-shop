import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "jsonc-parser";
import { describe, expect, it } from "vitest";

type Wrangler = {
  env: Record<string, { d1_databases: { database_id: string; database_name: string }[]; r2_buckets: { bucket_name: string }[]; vars: Record<string, string>; routes?: unknown[] }>;
};
const cfg = parse(readFileSync(resolve(import.meta.dirname, "../../wrangler.jsonc"), "utf8")) as Wrangler;

describe("wrangler environments", () => {
  it("has staging and production", () => {
    expect(Object.keys(cfg.env).sort()).toEqual(["production", "staging"]);
  });
  it("gives each environment its own database and bucket", () => {
    const s = cfg.env.staging, p = cfg.env.production;
    expect(s.d1_databases[0].database_id).not.toBe(p.d1_databases[0].database_id);
    expect(s.d1_databases[0].database_name).not.toBe(p.d1_databases[0].database_name);
    expect(s.r2_buckets[0].bucket_name).not.toBe(p.r2_buckets[0].bucket_name);
  });

  it("points each environment at its own address", () => {
    expect(cfg.env.staging.vars.SITE_URL).not.toBe(cfg.env.production.vars.SITE_URL);
    expect(cfg.env.staging.vars.BETTER_AUTH_URL).toBe(cfg.env.staging.vars.SITE_URL);
  });
});

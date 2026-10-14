import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { ConfigError } from "../worker/envelope";

const callWithBrokenDb = (error: Error) => {
  const brokenEnv = {
    ...env,
    DB: {
      prepare() {
        throw error;
      },
    },
  };
  return worker.fetch(
    new Request("http://shop.test/api/products"),
    brokenEnv as never,
    createExecutionContext(),
  );
};

describe("error handlers", () => {
  it("answers 500 in the envelope and leaks nothing", async () => {
    const res = await callWithBrokenDb(new Error("boom: select secret from x"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, data: null, error: "Something went wrong" });
    expect(text).not.toContain("boom");
  });

  it("answers 503 naming the missing binding", async () => {
    const res = await callWithBrokenDb(new ConfigError("DB is not set"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, data: null, error: "DB is not set" });
  });
});

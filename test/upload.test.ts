import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { cookieOf, json, request } from "./helpers";

type Reply = { ok: boolean; data: { key: string; name: string; size: number; type: string }; error: string | null };
const reply = async (res: Response): Promise<Reply> => (await res.json()) as Reply;

async function signUp() {
  return cookieOf(await request("/api/auth/sign-up/email", json({ name: "x", email: "a@example.com", password: "a-long-enough-password" })));
}

function upload(cookie: string, name: string, type: string, bytes: number): Promise<Response> {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], name, { type }));
  return request("/api/upload", { method: "POST", headers: { cookie }, body: form });
}

describe("upload", () => {
  it("needs a session", async () => {
    expect((await upload("", "a.png", "image/png", 10)).status).toBe(401);
  });

  it("refuses a big file", async () => {
    const res = await upload(await signUp(), "big.png", "image/png", 2 * 1024 * 1024 + 1);
    expect(res.status).toBe(413);
    expect((await reply(res)).error).toBe("That file is over 2 MB");
  });

  it("refuses a pdf", async () => {
    const res = await upload(await signUp(), "a.pdf", "application/pdf", 10);
    expect(res.status).toBe(415);
  });

  it("stores the file and serves it back with its type", async () => {
    const cookie = await signUp();
    const res = await upload(cookie, "receipt.png", "image/png", 16);
    expect(res.status).toBe(201);
    const { data } = await reply(res);
    expect(data).toMatchObject({ name: "receipt.png", size: 16, type: "image/png" });
    const back = await request(`/api/files/${data.key}`, { headers: { cookie } });
    expect(back.status).toBe(200);
    expect(back.headers.get("content-type")).toBe("image/png");
    expect((await back.arrayBuffer()).byteLength).toBe(16);
  });

  // The planted bug: fails on main (the bytes are in a Map, not in R2), passes on phase-1.
  it("puts the bytes in R2", async () => {
    const { data } = await reply(await upload(await signUp(), "receipt.png", "image/png", 16));
    const object = await env.FILES.get(data.key);
    expect(object).not.toBeNull();
    expect(object!.size).toBe(16);
    // The Workers pool needs an R2 object's body consumed before the test ends, or storage cannot be released.
    expect((await object!.arrayBuffer()).byteLength).toBe(16);
  });
});

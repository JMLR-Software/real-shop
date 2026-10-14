import { Hono } from "hono";
import { requireSession, type App } from "../auth";
import { fail, ok } from "../envelope";
import { logEvent } from "../log";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

// PLANTED BUG (phase 1): "the disk". Bytes kept here are gone when this copy of the Worker
// restarts, and another copy never had them. Files go in R2.
const disk = new Map<string, { type: string; bytes: ArrayBuffer }>();

export const upload = new Hono<App>();
upload.use("*", requireSession);

upload.post("/", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(c, "Send a file in the 'file' field", 400);
  if (!ALLOWED.has(file.type)) return fail(c, "Only png, jpeg or webp", 415);
  if (file.size > MAX_UPLOAD_BYTES) return fail(c, "That file is over 2 MB", 413);
  const key = `${c.var.session.user.id}/${crypto.randomUUID()}`;
  disk.set(key, { type: file.type, bytes: await file.arrayBuffer() });
  await c.env.DB.prepare(`insert into upload (key, userId, name, size, type, createdAt) values (?, ?, ?, ?, ?, ?)`)
    .bind(key, c.var.session.user.id, file.name, file.size, file.type, Date.now()).run();
  logEvent("upload", { userId: c.var.session.user.id, size: file.size, type: file.type });
  return ok(c, { key, name: file.name, size: file.size, type: file.type }, 201);
});

export const files = new Hono<App>();
files.use("*", requireSession);

files.get("/:userId/:id", async (c) => {
  const key = `${c.req.param("userId")}/${c.req.param("id")}`;
  if (c.req.param("userId") !== c.var.session.user.id) return fail(c, "Not your file", 403);
  const hit = disk.get(key);
  if (!hit) return fail(c, "No such file", 404);
  return new Response(hit.bytes, { headers: { "content-type": hit.type } });
});

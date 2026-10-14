import type { Envelope } from "../../worker/envelope";

/** Calls the API and unwraps the envelope. Throws Error(error) so pages show plain words. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include", ...init });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!body) throw new Error("The server sent nothing back");
  if (!body.ok || body.data === null) throw new Error(body.error ?? "Something went wrong");
  return body.data;
}

export const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

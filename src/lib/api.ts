import type { Envelope } from "../../worker/envelope";

/** An Error that remembers the HTTP status, so a page can tell a refused file from a missing sign-in. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** Calls the API and unwraps the envelope. Throws Error(error) so pages show plain words. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include", ...init });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!body) throw new Error("The server sent nothing back");
  if (!body.ok || body.data === null) throw new ApiError(body.error ?? "Something went wrong", res.status);
  return body.data;
}

export const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

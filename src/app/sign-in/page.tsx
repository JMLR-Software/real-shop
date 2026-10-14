"use client";
import { useState } from "react";
import { api, postJson } from "@/lib/api";

export default function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    setError(null);
    const body = { name: String(form.get("name") ?? ""), email: String(form.get("email")), password: String(form.get("password")) };
    try {
      await api(mode === "up" ? "/auth/sign-up/email" : "/auth/sign-in/email", postJson(body));
      window.location.href = "/account/";
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <form action={submit} className="flex max-w-sm flex-col gap-3">
      <h1 className="text-xl font-semibold">{mode === "up" ? "Make an account" : "Sign in"}</h1>
      {mode === "up" && <input id="name" name="name" placeholder="Your name" required className="rounded border p-2" />}
      <input id="email" name="email" type="email" placeholder="Email" required className="rounded border p-2" />
      <input id="password" name="password" type="password" placeholder="Password (8 or more)" minLength={8} required className="rounded border p-2" />
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button className="rounded bg-[color:var(--moss)] px-4 py-2 text-white">{mode === "up" ? "Sign up" : "Sign in"}</button>
      <button type="button" className="text-sm underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
        {mode === "up" ? "I have an account" : "I need an account"}
      </button>
    </form>
  );
}

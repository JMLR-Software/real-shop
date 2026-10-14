"use client";
import { useEffect, useState } from "react";
import { api, postJson } from "@/lib/api";
import { dollars } from "@/content/site";

type Line = { productId: string; name: string; priceCents: number; qty: number };

export default function Cart() {
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = () => api<Line[]>("/cart").then(setLines).catch((e: Error) => setStatus(e.message));
  useEffect(() => { load(); }, []);

  async function remove(productId: string) {
    try { setLines(await api<Line[]>(`/cart/${productId}`, { method: "DELETE" })); } catch (e) { setStatus((e as Error).message); }
  }

  async function checkout() {
    try {
      const { url } = await api<{ url: string }>("/checkout", postJson({}));
      window.location.href = url;
    } catch (e) { setStatus((e as Error).message); }
  }

  const total = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Your cart</h1>
      {status && <p role="alert">{status}</p>}
      <ul className="divide-y">
        {lines.map((l) => (
          <li key={l.productId} className="flex items-center justify-between py-2">
            <span>{l.qty} × {l.name}</span>
            <span className="font-mono">{dollars(l.priceCents * l.qty)}</span>
            <button id={`remove-${l.productId}`} onClick={() => remove(l.productId)} className="text-sm underline">Remove</button>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-mono">Total {dollars(total)}</p>
      <button id="checkout" onClick={checkout} disabled={lines.length === 0} className="mt-4 rounded bg-[color:var(--moss)] px-4 py-2 text-white disabled:opacity-50">
        Pay with Stripe (test)
      </button>
    </>
  );
}

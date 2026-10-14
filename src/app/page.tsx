"use client";
import { useEffect, useState } from "react";
import { api, postJson } from "@/lib/api";
import { addToCart } from "@/lib/cart-actions";
import { dollars, site, type Product } from "@/content/site";

export default function Shop() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    api<Product[]>("/products").then(setProducts).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <p className="mb-6 text-[color:var(--moss)]">{site.tagline}</p>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status" className="mb-3">{status}</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {(products ?? []).map((p) => (
          <li key={p.id} className="rounded border border-black/10 bg-white p-4">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm">{p.blurb}</p>
            <p className="mt-2 font-mono">{dollars(p.priceCents)}</p>
            <button
              id={`add-${p.id}`}
              className="mt-2 rounded border px-3 py-1 text-sm"
              onClick={() => addToCart({ api: (id) => api("/cart", postJson({ productId: id, qty: 1 })), setStatus }, p.id)}
            >
              Add to cart
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

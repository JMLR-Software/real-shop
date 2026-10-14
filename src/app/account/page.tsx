"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dollars } from "@/content/site";

type Order = { id: string; amountCents: number; status: string; createdAt: number };

export default function Account() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);

  useEffect(() => {
    api<Order[]>("/orders").then(setOrders).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error} <a href="/sign-in/" className="underline">Sign in</a></p>;
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Your orders</h1>
      <ul className="divide-y">
        {(orders ?? []).map((o) => (
          <li key={o.id} className="flex justify-between py-2">
            <span>{new Date(o.createdAt).toLocaleDateString()} · {o.status}</span>
            <span className="font-mono">{dollars(o.amountCents)}</span>
          </li>
        ))}
      </ul>
      {orders?.length === 0 && <p>No orders yet.</p>}
      <form
        className="mt-8 flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            const { key } = await api<{ key: string }>("/upload", { method: "POST", body: form });
            setUploaded(`/api/files/${key}`);
          } catch (err) { setError((err as Error).message); }
        }}
      >
        <label htmlFor="file" className="font-semibold">A receipt or a photo (png, jpeg, webp, under 2 MB)</label>
        <input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        <button className="w-fit rounded border px-3 py-1">Upload</button>
        {uploaded && <img src={uploaded} alt="Your upload" className="mt-2 max-h-48" />}
      </form>
    </>
  );
}

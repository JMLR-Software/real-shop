"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { dollars } from "@/content/site";

type Order = { id: string; amountCents: number; status: string; createdAt: number };

export default function Account() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    </>
  );
}

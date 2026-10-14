"use client";
import { useEffect, useState } from "react";
import { api, postJson } from "@/lib/api";

export default function Done() {
  const [status, setStatus] = useState("Thanks! Writing your order down…");
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";
    // PLANTED BUG (phase 1): the browser tells the server the payment happened. Phase-1 removes
    // this call; the page only says thanks, and the webhook has already written the order.
    api("/orders/confirm", postJson({ sessionId })).then(() => setStatus("Paid. Your order is in your account.")).catch((e: Error) => setStatus(e.message));
  }, []);
  return <p role="status">{status}</p>;
}

"use client";

export default function Done() {
  // The webhook has already written the order, or will within seconds. The page has nothing to
  // tell the server; it only tells the person.
  return <p role="status">Thanks! Your order is in <a href="/account/" className="underline">your account</a>.</p>;
}

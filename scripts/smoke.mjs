// Smoke: pnpm smoke [base-url]. Default http://localhost:8787. Needs .dev.vars (local) or the
// env's secrets (staging). The webhook leg needs the Stripe CLI logged in to the account the
// key belongs to; set STRIPE_PROJECT to the CLI profile name when it is not the default one
// (`stripe config --list` shows them), and have `stripe listen` running on that profile locally.
import { execFileSync } from "node:child_process";

const base = process.argv[2] ?? "http://localhost:8787";
const email = `smoke-${Date.now()}@example.com`;
const ORDER_WAIT_MS = 20_000;
const check = (name, condition) => { console.log(`${condition ? "ok  " : "FAIL"} ${name}`); if (!condition) process.exitCode = 1; };
// Better Auth refuses a POST whose Origin is missing or "null" (Node's fetch sends the latter), so say who we are.
const post = (path, body, extra = {}) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: base, ...extra }, body });

const health = await (await fetch(`${base}/api/health`)).json();
check("health", health.ok === true);

const up = await post("/api/auth/sign-up/email", JSON.stringify({ name: "Smoke", email, password: "a-long-enough-password" }));
check("sign-up 200", up.status === 200);
const cookie = (up.headers.getSetCookie()[0] ?? "").split(";")[0];
check("session cookie", cookie.includes("="));
const userId = (await up.json()).data?.user?.id;
check("user id", typeof userId === "string");

const add = await post("/api/cart", JSON.stringify({ productId: "candle", qty: 1 }), { cookie });
check("cart add", (await add.json()).ok === true);

const co = await post("/api/checkout", "{}", { cookie });
const coBody = await co.json();
check("checkout url", typeof coBody.data?.url === "string" && coBody.data.url.includes("stripe.com"));

// A completed session for this user, with the cart snapshot the webhook reads. `--add` sets
// fields on the fixture's session; the syntax was verified live on 2026-10-14.
const items = JSON.stringify([{ productId: "candle", qty: 1, priceCents: 1800 }]);
const profile = process.env.STRIPE_PROJECT ? ["--project-name", process.env.STRIPE_PROJECT] : [];
const trigger = ["trigger", "checkout.session.completed", ...profile,
  "--add", `checkout_session:client_reference_id=${userId}`, "--add", `checkout_session:metadata[items]=${items}`];
try {
  // No shell in between, so the JSON needs no quoting. The CLI's own errors go to stderr.
  execFileSync("stripe", trigger, { stdio: ["ignore", "ignore", "inherit"] });
  check("stripe trigger ran", true);
} catch {
  check("stripe trigger ran (install the Stripe CLI, `stripe login`, and STRIPE_PROJECT if needed)", false);
}

// The webhook writes the order a moment later; ask until it shows.
const deadline = Date.now() + ORDER_WAIT_MS;
let orders = [];
while (Date.now() < deadline && orders.length === 0) {
  await new Promise((r) => setTimeout(r, 1000));
  orders = (await (await fetch(`${base}/api/orders`, { headers: { cookie } })).json().catch(() => ({}))).data ?? [];
}
check("order recorded by the webhook", orders.length === 1 && orders[0].status === "paid");

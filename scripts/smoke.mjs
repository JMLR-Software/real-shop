// Smoke: pnpm smoke [base-url]. Default http://localhost:8787. Needs .dev.vars (local) or the
// env's secrets (staging). The webhook leg needs the Stripe CLI logged in.
import { execSync } from "node:child_process";

const base = process.argv[2] ?? "http://localhost:8787";
const email = `smoke-${Date.now()}@example.com`;
const check = (name, condition) => { console.log(`${condition ? "ok  " : "FAIL"} ${name}`); if (!condition) process.exitCode = 1; };

const health = await (await fetch(`${base}/api/health`)).json();
check("health", health.ok === true);

const up = await fetch(`${base}/api/auth/sign-up/email`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Smoke", email, password: "a-long-enough-password" }) });
check("sign-up 200", up.status === 200);
const cookie = (up.headers.get("set-cookie") ?? "").split(";")[0];

const add = await fetch(`${base}/api/cart`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ productId: "candle", qty: 1 }) });
check("cart add", (await add.json()).ok === true);

const co = await fetch(`${base}/api/checkout`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: "{}" });
const coBody = await co.json();
check("checkout url", typeof coBody.data?.url === "string" && coBody.data.url.includes("stripe.com"));

try {
  execSync("stripe trigger checkout.session.completed", { stdio: "ignore" });
  check("stripe trigger ran", true);
} catch {
  check("stripe trigger ran (install the Stripe CLI and `stripe login`)", false);
}

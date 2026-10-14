import Stripe from "stripe";
import type { Env } from "./env";
import { ConfigError } from "./envelope";

const TEST_PREFIX = "sk_test_";

/** Test mode only. A live key fails closed instead of taking real money from a practice app. */
export function assertTestKey(key?: string): string {
  if (!key) throw new ConfigError("STRIPE_SECRET_KEY is not set");
  if (!key.startsWith(TEST_PREFIX)) throw new ConfigError("Refusing to run: STRIPE_SECRET_KEY is not a test key");
  return key;
}

export function stripeFor(env: Env): Stripe {
  // Workers have fetch and SubtleCrypto, not Node's http or crypto.
  return new Stripe(assertTestKey(env.STRIPE_SECRET_KEY), { httpClient: Stripe.createFetchHttpClient() });
}

export const cryptoProvider = () => Stripe.createSubtleCryptoProvider();

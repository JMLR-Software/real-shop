import { expect, test } from "@playwright/test";

test("sign up, add, pay with the test card, see the order", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/sign-in/");
  await page.getByText("I need an account").click();
  await page.fill("#name", "E2E");
  await page.fill("#email", email);
  await page.fill("#password", "a-long-enough-password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.waitForURL("**/account/");

  await page.goto("/");
  await page.click("#add-candle");
  await expect(page.getByRole("status")).toHaveText("Added");

  await page.goto("/cart/");
  await page.click("#checkout");
  await page.waitForURL(/checkout\.stripe\.com/);
  await page.fill("#email", email);
  // The payment methods are an accordion (Card, Cash App, Klarna...) and the card fields
  // exist only once Card is chosen. Its button has no clickable box of its own (a pointer
  // click lands on a cover element), so the click is dispatched to it. Seen 2026-10-14.
  await page.getByTestId("card-accordion-item-button").dispatchEvent("click");
  await page.fill("#cardNumber", "4242 4242 4242 4242");
  await page.fill("#cardExpiry", "12 / 34");
  await page.fill("#cardCvc", "123");
  await page.fill("#billingName", "E2E");
  await page.fill("#billingPostalCode", "12345");
  // "Save my info" (Link) would then ask for a phone number; leave it off.
  const saveWithLink = page.locator("#enableStripePass");
  if (await saveWithLink.isChecked()) await saveWithLink.uncheck();
  await page.getByTestId("hosted-payment-submit-button").click();
  await page.waitForURL("**/checkout/done/**");

  await page.goto("/account/");
  // The webhook writes the order a moment after the redirect, so reload until it shows.
  await expect.poll(async () => {
    await page.reload();
    return (await page.locator("li").allTextContents()).join(" ");
  }, { timeout: 20_000 }).toContain("paid");
});

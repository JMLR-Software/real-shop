// Every word and number on the site lives here, so a page never invents copy.
export const site = {
  name: "The Candle Shop",
  tagline: "Small things that smell nice.",
  products: [
    { id: "candle", name: "Beeswax candle", priceCents: 1800, blurb: "Burns for forty hours." },
    { id: "wick", name: "Spare wicks, pack of ten", priceCents: 400, blurb: "Cotton, pre-waxed." },
    { id: "soap", name: "Oat soap", priceCents: 700, blurb: "Unscented, for sensitive skin." },
    { id: "jar", name: "Glass jar", priceCents: 900, blurb: "Fits every candle we make." },
    { id: "matches", name: "Long matches", priceCents: 300, blurb: "A box of fifty." },
  ],
} as const;

export type Product = (typeof site.products)[number];

export const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

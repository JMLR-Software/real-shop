import { dollars, site } from "@/content/site";

export default function Shop() {
  return (
    <>
      <p className="mb-6 text-[color:var(--moss)]">{site.tagline}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {site.products.map((p) => (
          <li key={p.id} className="rounded border border-black/10 bg-white p-4">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm">{p.blurb}</p>
            <p className="mt-2 font-mono">{dollars(p.priceCents)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

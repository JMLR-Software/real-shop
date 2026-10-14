import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { site } from "@/content/site";

export const metadata: Metadata = { title: site.name, description: site.tagline };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <Link href="/" className="text-lg font-semibold">{site.name}</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/cart/">Cart</Link>
            <Link href="/account/">Account</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}

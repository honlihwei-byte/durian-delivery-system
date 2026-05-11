"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

type Props = {
  products: Product[];
};

export default function ShopClient({ products }: Props) {
  const { addProduct, itemCount } = useCart();
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    if (!products.length) return ["All"];
    const set = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filtered = useMemo(() => {
    if (category === "All") return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  return (
    <div className="min-h-screen pb-24">
      <SiteHeader
        subtitle="Browse products · Drive-thru pickup"
        right={
          <Link
            href="/cart"
            className="rounded-lg border border-drive-line bg-drive-bg px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-line/50"
          >
            Cart ({itemCount})
          </Link>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                c === category
                  ? "bg-drive-accent text-white"
                  : "border border-drive-line bg-drive-surface text-drive-ink hover:border-drive-accent/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-drive-line bg-drive-surface shadow-sm"
            >
              <div className="relative aspect-square bg-drive-bg">
                <Image
                  src={p.image_url}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {p.stock <= 5 ? (
                  <span className="absolute left-2 top-2 rounded-md bg-drive-warn px-2 py-0.5 text-xs font-semibold text-white">
                    Low stock
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-drive-muted">
                  {p.category}
                </p>
                <h2 className="mt-1 text-base font-semibold text-drive-ink">{p.name}</h2>
                <p className="mt-2 text-lg font-bold text-drive-accent">
                  ${Number(p.price).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-drive-muted">{p.stock} in stock</p>
                <button
                  type="button"
                  disabled={p.stock <= 0}
                  onClick={() => addProduct(p, 1)}
                  className="mt-4 w-full rounded-xl bg-drive-accent py-2.5 text-sm font-semibold text-white transition hover:bg-drive-accentMuted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {p.stock <= 0 ? "Out of stock" : "Add to cart"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-drive-line bg-drive-surface/95 p-4 backdrop-blur sm:hidden">
        <Link
          href="/cart"
          className="flex w-full items-center justify-center rounded-xl bg-drive-accent py-3 text-sm font-semibold text-white"
        >
          View cart ({itemCount})
        </Link>
      </div>
    </div>
  );
}

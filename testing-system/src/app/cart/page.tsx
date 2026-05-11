"use client";

import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { lines, setQuantity, removeLine, subtotal, itemCount } = useCart();

  return (
    <div className="min-h-screen">
      <SiteHeader
        subtitle="Review your items"
        right={
          <Link href="/shop" className="text-sm font-medium text-drive-accent hover:underline">
            Continue shopping
          </Link>
        }
      />
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        {lines.length === 0 ? (
          <div className="rounded-2xl border border-drive-line bg-drive-surface p-8 text-center">
            <p className="text-drive-muted">Your cart is empty.</p>
            <Link
              href="/shop"
              className="mt-4 inline-block rounded-xl bg-drive-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex gap-3 rounded-2xl border border-drive-line bg-drive-surface p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-drive-bg">
                    <Image
                      src={line.imageUrl}
                      alt={line.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-drive-ink">{line.name}</p>
                    <p className="text-sm text-drive-muted">
                      ${line.price.toFixed(2)} each
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="sr-only" htmlFor={`qty-${line.productId}`}>
                        Quantity
                      </label>
                      <input
                        id={`qty-${line.productId}`}
                        type="number"
                        min={1}
                        max={line.maxStock}
                        value={line.quantity}
                        onChange={(e) =>
                          setQuantity(line.productId, Number.parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 rounded-lg border border-drive-line px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(line.productId)}
                        className="text-sm text-drive-warn hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold text-drive-ink">
                    ${(line.price * line.quantity).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-drive-line bg-drive-surface p-4">
              <div className="flex justify-between text-sm">
                <span className="text-drive-muted">Items</span>
                <span>{itemCount}</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-drive-accent py-3 text-sm font-semibold text-white hover:bg-drive-accentMuted"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

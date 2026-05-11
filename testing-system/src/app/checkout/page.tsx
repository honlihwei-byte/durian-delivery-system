"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPendingOrder } from "@/actions/orders";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, itemCount, clear } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await createPendingOrder({
      customerName: name,
      phone,
      carPlate,
      lines,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clear();
    router.push(`/order/${res.orderId}`);
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader subtitle="Checkout" />
        <main className="mx-auto max-w-lg px-4 py-12 text-center sm:px-6">
          <p className="text-drive-muted">Your cart is empty.</p>
          <Link href="/shop" className="mt-4 inline-block text-drive-accent hover:underline">
            Return to shop
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader subtitle="Pickup details" />
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-drive-line bg-drive-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-drive-muted">
              Your vehicle
            </h2>
            <p className="mt-1 text-sm text-drive-muted">
              We use this to call you at the pickup window.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-drive-ink">
                  Name
                </label>
                <input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  placeholder="Alex Rivera"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-drive-ink">
                  Phone number
                </label>
                <input
                  id="phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                  placeholder="+1 555 010 2030"
                />
              </div>
              <div>
                <label htmlFor="plate" className="block text-sm font-medium text-drive-ink">
                  License plate
                </label>
                <input
                  id="plate"
                  required
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-drive-line px-3 py-2.5 font-mono text-sm uppercase outline-none ring-drive-accent/30 focus:ring-2"
                  placeholder="ABC 1234"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-drive-line bg-drive-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-drive-muted">
              Order summary
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-2">
                  <span className="text-drive-ink">
                    {l.name} × {l.quantity}
                  </span>
                  <span className="shrink-0 font-medium">
                    ${(l.price * l.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-drive-line pt-4 text-base font-semibold">
              <span>Total ({itemCount} items)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </section>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-drive-accent py-3 text-sm font-semibold text-white transition hover:bg-drive-accentMuted disabled:opacity-60"
          >
            {loading ? "Placing order…" : "Place order (pending payment)"}
          </button>

          <p className="text-center text-xs text-drive-muted">
            You will complete a demo payment on the next screen. No real card is charged.
          </p>
        </form>
      </main>
    </div>
  );
}

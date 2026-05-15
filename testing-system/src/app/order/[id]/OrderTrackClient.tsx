"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getDemoOrderWithItems } from "@/lib/demo-orders-storage";
import { ORDER_STATUS_LABEL } from "@/types";
import type { OrderItemRow, OrderRow } from "@/types";
import { OrderArrivalClient } from "./OrderArrivalClient";
import { OrderPayClient } from "./OrderPayClient";

type Props = { orderId: string };

export function OrderTrackClient({ orderId }: Props) {
  const [data, setData] = useState<{
    order: OrderRow;
    items: OrderItemRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setData(getDemoOrderWithItems(orderId));
  }, [orderId]);

  useEffect(() => {
    setData(getDemoOrderWithItems(orderId));
    setLoading(false);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader subtitle="Track your order" />
        <main className="mx-auto max-w-lg px-4 py-12 text-center text-drive-muted sm:px-6">
          Loading order…
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <SiteHeader subtitle="Track your order" />
        <main className="mx-auto max-w-lg px-4 py-12 text-center sm:px-6">
          <p className="text-drive-ink">We couldn&apos;t find this order on this device.</p>
          <p className="mt-2 text-sm text-drive-muted">
            Demo orders are stored in your browser (localStorage). Open the link on the same
            browser you used to check out, or place a new order.
          </p>
          <Link href="/shop" className="mt-6 inline-block font-medium text-drive-accent hover:underline">
            Back to shop
          </Link>
        </main>
      </div>
    );
  }

  const { order, items } = data;

  return (
    <div className="min-h-screen">
      <SiteHeader subtitle="Track your order" />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-drive-line bg-drive-surface p-5">
          <p className="text-xs font-medium uppercase text-drive-muted">Order ID</p>
          <p className="mt-1 font-mono text-sm text-drive-ink">{order.id}</p>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-drive-muted">Name</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-drive-muted">Phone</span>
              <span className="font-medium">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-drive-muted">Plate (at checkout)</span>
              <span className="font-mono font-medium">{order.car_plate}</span>
            </div>
            <div className="flex justify-between border-t border-drive-line pt-3">
              <span className="text-drive-muted">Total</span>
              <span className="text-lg font-bold text-drive-accent">
                ${Number(order.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-drive-line bg-drive-surface p-5">
          <h2 className="text-sm font-semibold text-drive-ink">Items</h2>
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-drive-bg">
                  {item.product?.image_url ? (
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name ?? "Product"}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-drive-ink">{item.product?.name ?? "Product"}</p>
                  <p className="text-drive-muted">
                    {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
                <span className="font-semibold">
                  ${(item.quantity * Number(item.unit_price)).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {order.status === "pending" ? (
          <OrderPayClient order={order} onPaid={reload} />
        ) : (
          <OrderArrivalClient order={order} onUpdated={reload} />
        )}

        {order.status !== "pending" ? (
          <p className="text-center text-xs text-drive-muted">
            Order status:{" "}
            <span className="font-semibold text-drive-ink">{ORDER_STATUS_LABEL[order.status]}</span>
          </p>
        ) : null}

        <Link
          href="/shop"
          className="block text-center text-sm font-medium text-drive-accent hover:underline"
        >
          Order something else
        </Link>
      </main>
    </div>
  );
}

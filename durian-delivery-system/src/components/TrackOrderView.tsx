"use client";

import { useEffect, useState } from "react";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  TRACKING_ORDER_STATUSES,
} from "@/lib/labels";
import { formatPrice } from "@/lib/products";
import type { OrderStatus, TrackedOrder } from "@/lib/types";
import { getTrackingApiPath } from "@/lib/tracking";

type TrackOrderViewProps = {
  token: string;
};

export function TrackOrderView({ token }: TrackOrderViewProps) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(getTrackingApiPath(token));
        const data = (await response.json()) as {
          order?: TrackedOrder;
          status_label?: string;
          error?: string;
        };

        if (!response.ok || !data.order) {
          throw new Error(data.error ?? "Pesanan tidak dijumpai.");
        }

        setOrder(data.order);
        setStatusLabel(
          data.status_label ??
            CUSTOMER_ORDER_STATUS_LABELS[data.order.status],
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Pesanan tidak dijumpai.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [token]);

  if (isLoading) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600">
        Memuatkan pesanan...
      </p>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-lg font-bold text-red-900">Pesanan Tidak Dijumpai</h1>
        <p className="mt-2 text-sm text-red-800">
          {error ?? "Sila semak pautan jejak pesanan anda."}
        </p>
      </div>
    );
  }

  const currentStatusIndex = TRACKING_ORDER_STATUSES.indexOf(order.status);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">No. Pesanan</p>
        <p className="text-2xl font-bold text-stone-900">{order.order_number}</p>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
          {statusLabel}
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Status Pesanan</h2>
        <ol className="mt-4 space-y-3">
          {TRACKING_ORDER_STATUSES.map((status, index) => {
            const isComplete = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;

            return (
              <li key={status} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete
                      ? "bg-amber-500 text-white"
                      : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-sm ${
                    isCurrent
                      ? "font-semibold text-stone-900"
                      : isComplete
                        ? "text-stone-700"
                        : "text-stone-400"
                  }`}
                >
                  {CUSTOMER_ORDER_STATUS_LABELS[status]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Butiran Pesanan</h2>
        <div className="mt-3 space-y-2">
          {order.order_items.map((item, index) => (
            <div
              key={`${item.product_name}-${index}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-medium text-stone-900">{item.product_name}</p>
                <p className="text-stone-600">
                  {formatPrice(item.unit_price)} × {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-stone-900">
                {formatPrice(item.line_subtotal)}
              </p>
            </div>
          ))}
        </div>
        <dl className="mt-4 space-y-2 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between text-stone-700">
            <dt>Subtotal Produk</dt>
            <dd>{formatPrice(order.product_subtotal)}</dd>
          </div>
          <div className="flex justify-between text-stone-700">
            <dt>Caj Penghantaran</dt>
            <dd>
              {order.delivery_fee === 0
                ? "Percuma"
                : formatPrice(order.delivery_fee)}
            </dd>
          </div>
          <div className="flex justify-between font-bold text-stone-900">
            <dt>Jumlah</dt>
            <dd>{formatPrice(order.total_amount)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Penghantaran</h2>
        <dl className="mt-3 space-y-2 text-sm text-stone-700">
          <div>
            <dt className="font-medium text-stone-500">Tarikh Penghantaran</dt>
            <dd>{order.delivery_date}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-500">Masa Penghantaran</dt>
            <dd>{order.delivery_time_note}</dd>
          </div>
          {order.delivery_note ? (
            <div>
              <dt className="font-medium text-stone-500">Nota Penghantaran</dt>
              <dd className="break-words">{order.delivery_note}</dd>
            </div>
          ) : null}
          {order.customer_notes ? (
            <div>
              <dt className="font-medium text-stone-500">Nota Anda</dt>
              <dd className="break-words">{order.customer_notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}

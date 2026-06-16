"use client";

import { useEffect, useState } from "react";
import { formatDeliveryDateMY } from "@/lib/delivery";
import { TRACKING_ORDER_STATUSES } from "@/lib/labels";
import { formatPrice } from "@/lib/products";
import type { OrderStatus, ProductId, TrackedOrder } from "@/lib/types";
import { getTrackingApiPath } from "@/lib/tracking";
import { useLanguage } from "./LanguageProvider";

type TrackOrderViewProps = {
  token: string;
};

function formatDeliveryTimeNote(order: TrackedOrder, anytimeLabel: string): string {
  if (order.delivery_time_type === "masa_pilihan" && order.delivery_time_note) {
    return order.delivery_time_note;
  }

  return anytimeLabel;
}

export function TrackOrderView({ token }: TrackOrderViewProps) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
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
          error?: string;
        };

        if (!response.ok || !data.order) {
          throw new Error("not-found");
        }

        setOrder(data.order);
      } catch {
        setError("not-found");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [token]);

  if (isLoading) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600">
        {t.track.loading}
      </p>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="text-lg font-bold text-red-900">{t.track.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-red-800">{t.track.notFoundMessage}</p>
      </div>
    );
  }

  const currentStatusIndex = TRACKING_ORDER_STATUSES.indexOf(order.status);
  const deliveryDateLabel = formatDeliveryDateMY(
    order.delivery_date_raw,
    language,
  );
  const deliveryTimeLabel = formatDeliveryTimeNote(order, t.deliveryTimeAnytime);

  function productName(productId: ProductId, fallback: string) {
    return t.products[productId]?.name ?? fallback;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">{t.track.orderNumber}</p>
        <p className="text-2xl font-bold text-stone-900">{order.order_number}</p>
        <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
          {t.status[order.status]}
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">{t.track.statusTitle}</h2>
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
                  {t.status[status as OrderStatus]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">{t.track.detailsTitle}</h2>
        <div className="mt-3 space-y-2">
          {order.order_items.map((item, index) => (
            <div
              key={`${item.product_id}-${index}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-medium text-stone-900">
                  {productName(item.product_id, item.product_name)}
                </p>
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
            <dt>{t.summary.productSubtotal}</dt>
            <dd>{formatPrice(order.product_subtotal)}</dd>
          </div>
          <div className="flex justify-between text-stone-700">
            <dt>{t.summary.deliveryFee}</dt>
            <dd>
              {order.delivery_fee === 0
                ? t.summary.free
                : formatPrice(order.delivery_fee)}
            </dd>
          </div>
          <div className="flex justify-between font-bold text-stone-900">
            <dt>{t.summary.total}</dt>
            <dd>{formatPrice(order.total_amount)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">{t.track.deliveryTitle}</h2>
        <dl className="mt-3 space-y-2 text-sm text-stone-700">
          <div>
            <dt className="font-medium text-stone-500">{t.track.deliveryDate}</dt>
            <dd>{deliveryDateLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-500">{t.track.deliveryTime}</dt>
            <dd>{deliveryTimeLabel}</dd>
          </div>
          {order.delivery_note ? (
            <div>
              <dt className="font-medium text-stone-500">{t.track.deliveryNote}</dt>
              <dd className="break-words">{order.delivery_note}</dd>
            </div>
          ) : null}
          {order.customer_notes ? (
            <div>
              <dt className="font-medium text-stone-500">{t.track.customerNotes}</dt>
              <dd className="break-words">{order.customer_notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}

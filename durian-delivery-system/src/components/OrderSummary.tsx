"use client";

import { formatPrice } from "@/lib/products";
import type { OrderPricing, ProductId } from "@/lib/types";
import { useLanguage } from "./LanguageProvider";

type OrderSummaryProps = {
  pricing: OrderPricing;
};

export function OrderSummary({ pricing }: OrderSummaryProps) {
  const { t } = useLanguage();

  if (pricing.items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
        {t.summary.empty}
      </section>
    );
  }

  function productName(productId: ProductId) {
    return t.products[productId]?.name ?? productId;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">{t.summary.title}</h2>

      <div className="space-y-3">
        {pricing.items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3 text-sm last:border-b-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-stone-900">
                {productName(item.product_id)}
              </p>
              <p className="mt-0.5 text-stone-600">
                {formatPrice(item.unit_price)} × {item.quantity}
              </p>
            </div>
            <p className="font-semibold text-stone-900">
              {formatPrice(item.line_subtotal)}
            </p>
          </div>
        ))}
      </div>

      <dl className="space-y-2 border-t border-stone-200 pt-3 text-sm">
        <div className="flex items-center justify-between text-stone-700">
          <dt>{t.summary.productSubtotal}</dt>
          <dd className="font-medium">{formatPrice(pricing.productSubtotal)}</dd>
        </div>
        <div className="flex items-center justify-between text-stone-700">
          <dt>{t.summary.deliveryFee}</dt>
          <dd className="font-medium">
            {pricing.deliveryFee === 0
              ? t.summary.free
              : formatPrice(pricing.deliveryFee)}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
          <dt>{t.summary.total}</dt>
          <dd>{formatPrice(pricing.totalAmount)}</dd>
        </div>
      </dl>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { formatDeliveryDateMY, getTomorrowDateMY } from "@/lib/delivery";
import { calculateOrderPricing } from "@/lib/pricing";
import { EMPTY_QUANTITIES, PRODUCT_IDS, PRODUCTS } from "@/lib/products";
import type { DeliveryTimeType, ProductId } from "@/lib/types";
import {
  MAX_ADDRESS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PREFERRED_TIME_LENGTH,
  MAX_QUANTITY,
  MAX_WHATSAPP_LENGTH,
} from "@/lib/validation";
import { useLanguage } from "./LanguageProvider";
import { OrderSuccess } from "./OrderSuccess";
import { OrderSummary } from "./OrderSummary";
import { ProductSelector } from "./ProductSelector";

type FormState = {
  customer_name: string;
  whatsapp_number: string;
  delivery_address: string;
  delivery_time_type: DeliveryTimeType;
  preferred_delivery_time: string;
  notes: string;
};

const initialFormState: FormState = {
  customer_name: "",
  whatsapp_number: "",
  delivery_address: "",
  delivery_time_type: "bila_bila_masa",
  preferred_delivery_time: "",
  notes: "",
};

export function OrderForm() {
  const { t, language } = useLanguage();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [quantities, setQuantities] =
    useState<Record<ProductId, number>>(EMPTY_QUANTITIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{
    id: string;
    orderNumber: string;
    trackingCode: string;
  } | null>(null);

  const deliveryDate = useMemo(() => getTomorrowDateMY(), []);
  const deliveryDateLabel = useMemo(
    () => formatDeliveryDateMY(deliveryDate, language),
    [deliveryDate, language],
  );

  const cartLines = useMemo(
    () =>
      PRODUCT_IDS.map((productId) => ({
        product_id: productId,
        quantity: quantities[productId],
      })),
    [quantities],
  );

  const pricing = useMemo(() => calculateOrderPricing(cartLines), [cartLines]);
  const hasItems = pricing.items.length > 0;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function updateQuantity(productId: ProductId, quantity: number) {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.min(MAX_QUANTITY, Math.max(0, quantity)),
    }));
    setError(null);
  }

  function selectDeliveryTimeType(type: DeliveryTimeType) {
    setForm((current) => ({
      ...current,
      delivery_time_type: type,
      preferred_delivery_time:
        type === "bila_bila_masa" ? "" : current.preferred_delivery_time,
    }));
    setError(null);
  }

  function resetForm() {
    setForm(initialFormState);
    setQuantities(EMPTY_QUANTITIES);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasItems) {
      setError(t.errors.selectPackage);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessOrder(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.customer_name,
          whatsapp_number: form.whatsapp_number,
          delivery_address: form.delivery_address,
          delivery_time_type: form.delivery_time_type,
          preferred_delivery_time:
            form.delivery_time_type === "masa_pilihan"
              ? form.preferred_delivery_time
              : undefined,
          notes: form.notes,
          items: cartLines.filter((line) => line.quantity > 0),
        }),
      });

      const data = (await response.json()) as {
        id?: string;
        order_number?: string;
        tracking_code?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t.errors.placeOrderFailed);
      }

      if (!data.id || !data.order_number || !data.tracking_code) {
        throw new Error(t.errors.placeOrderFailed);
      }

      setSuccessOrder({
        id: data.id,
        orderNumber: data.order_number,
        trackingCode: data.tracking_code,
      });
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.errors.placeOrderFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successOrder) {
    return (
      <OrderSuccess
        orderId={successOrder.id}
        orderNumber={successOrder.orderNumber}
        trackingCode={successOrder.trackingCode}
        onNewOrder={() => setSuccessOrder(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-center shadow-sm">
        <p className="text-lg font-bold text-amber-950">{t.form.scheduleTitle}</p>
        <p className="mt-1 text-sm text-amber-900">{deliveryDateLabel}</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-700">
        {t.form.scheduleNotice}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">{t.form.name}</span>
          <input
            required
            type="text"
            value={form.customer_name}
            onChange={(event) => updateField("customer_name", event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            placeholder={t.form.namePlaceholder}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">{t.form.whatsapp}</span>
          <input
            required
            type="tel"
            inputMode="tel"
            value={form.whatsapp_number}
            onChange={(event) =>
              updateField("whatsapp_number", event.target.value)
            }
            maxLength={MAX_WHATSAPP_LENGTH}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            placeholder={t.form.whatsappPlaceholder}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">{t.form.address}</span>
          <textarea
            required
            rows={3}
            value={form.delivery_address}
            onChange={(event) =>
              updateField("delivery_address", event.target.value)
            }
            maxLength={MAX_ADDRESS_LENGTH}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            placeholder={t.form.addressPlaceholder}
          />
        </label>

        <div className="space-y-3">
          <span className="text-sm font-medium text-stone-700">{t.form.packages}</span>
          <ProductSelector
            products={PRODUCTS}
            quantities={quantities}
            onChangeQuantity={updateQuantity}
          />
        </div>

        <OrderSummary pricing={pricing} />

        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-sm font-medium text-stone-700">{t.form.deliveryDate}</p>
          <p className="mt-1 text-base font-semibold text-stone-900">
            {t.form.deliveryDateTomorrow} · {deliveryDateLabel}
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-stone-700">
            {t.form.deliveryTime}
          </legend>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
              form.delivery_time_type === "bila_bila_masa"
                ? "border-amber-500 bg-amber-50"
                : "border-stone-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="delivery_time_type"
              value="bila_bila_masa"
              checked={form.delivery_time_type === "bila_bila_masa"}
              onChange={() => selectDeliveryTimeType("bila_bila_masa")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-stone-900">
                {t.deliveryTime.bila_bila_masa}
              </span>
              <span className="mt-0.5 block text-xs text-amber-800">
                {t.form.deliveryTimeRecommended}
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
              form.delivery_time_type === "masa_pilihan"
                ? "border-amber-500 bg-amber-50"
                : "border-stone-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="delivery_time_type"
              value="masa_pilihan"
              checked={form.delivery_time_type === "masa_pilihan"}
              onChange={() => selectDeliveryTimeType("masa_pilihan")}
              className="mt-1"
            />
            <span className="text-sm font-semibold text-stone-900">
              {t.deliveryTime.masa_pilihan}
            </span>
          </label>

          {form.delivery_time_type === "masa_pilihan" ? (
            <label className="block space-y-1.5 pl-1">
              <span className="text-sm font-medium text-stone-700">
                {t.form.preferredTime}
              </span>
              <input
                required
                type="text"
                value={form.preferred_delivery_time}
                onChange={(event) =>
                  updateField("preferred_delivery_time", event.target.value)
                }
                maxLength={MAX_PREFERRED_TIME_LENGTH}
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder={t.form.preferredTimePlaceholder}
              />
            </label>
          ) : null}
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">{t.form.notes}</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            maxLength={MAX_NOTES_LENGTH}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            placeholder={t.form.notesPlaceholder}
          />
        </label>
      </section>

      <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4">
        <p className="text-sm font-semibold text-amber-900">{t.form.paymentTitle}</p>
        <p className="mt-1 text-sm text-amber-800">{t.form.paymentDescription}</p>
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !hasItems}
        className="w-full rounded-2xl bg-amber-600 px-4 py-4 text-base font-bold text-white shadow-md transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t.form.submitting : t.form.submit}
      </button>
    </form>
  );
}

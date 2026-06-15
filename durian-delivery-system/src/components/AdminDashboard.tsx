"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { formatDeliveryDateMY } from "@/lib/delivery";
import {
  formatDeliveryTimePreference,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
} from "@/lib/labels";
import { isForwardStatusTransition } from "@/lib/order-status";
import { formatPrice } from "@/lib/products";
import type { Order, OrderStatus } from "@/lib/types";
import { formatOrderNumber, getTrackingUrl } from "@/lib/tracking";
import { MAX_DELIVERY_NOTE_LENGTH } from "@/lib/validation";

const STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  confirmed: "bg-amber-100 text-amber-800",
  preparing_tomorrow_morning: "bg-orange-100 text-orange-800",
  packed: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-800",
};

type AdminDashboardProps = {
  onUnauthorized?: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function whatsappLink(number: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;

  const normalized = digits.startsWith("60")
    ? digits
    : `60${digits.replace(/^0/, "")}`;

  return `https://wa.me/${normalized}`;
}

export function AdminDashboard({ onUnauthorized }: AdminDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeStatus, setActiveStatus] = useState<OrderStatus>("new");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders");

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      const data = (await response.json()) as {
        orders?: Order[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load orders.");
      }

      setOrders(data.orders ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load orders.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setDeliveryNotes(
      Object.fromEntries(
        orders.map((order) => [order.id, order.delivery_note ?? ""]),
      ),
    );
  }, [orders]);

  const counts = useMemo(() => {
    return ORDER_STATUSES.reduce(
      (accumulator, status) => {
        accumulator[status] = orders.filter((order) => order.status === status).length;
        return accumulator;
      },
      {} as Record<OrderStatus, number>,
    );
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => order.status === activeStatus),
    [orders, activeStatus],
  );

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      const data = (await response.json()) as { order?: Order; error?: string };

      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Unable to update order.");
      }

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order! : order)),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update order.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveDeliveryNote(orderId: string) {
    setSavingNoteId(orderId);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_note: deliveryNotes[orderId] ?? null,
        }),
      });

      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }

      const data = (await response.json()) as { order?: Order; error?: string };

      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Unable to save delivery note.");
      }

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order! : order)),
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save delivery note.",
      );
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Order Dashboard</h1>
          <p className="text-sm text-stone-600">
            Tempahan hari ini, hantar esok — urus status pesanan.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="min-h-11 rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="min-h-11 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveStatus(status)}
            className={`rounded-2xl border p-3 text-left transition sm:p-4 ${
              activeStatus === status
                ? "border-amber-500 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white"
            }`}
          >
            <p className="text-[11px] font-semibold leading-snug text-stone-500 sm:text-xs">
              {ORDER_STATUS_LABELS[status]}
            </p>
            <p className="mt-2 text-2xl font-bold text-stone-900">
              {counts[status]}
            </p>
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-stone-600">Loading orders...</p>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          Tiada pesanan dalam status {ORDER_STATUS_LABELS[activeStatus]}.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const waLink = whatsappLink(order.whatsapp_number);
            const nextStatuses = ORDER_STATUSES.filter(
              (status) =>
                status !== order.status &&
                isForwardStatusTransition(order.status, status),
            );
            const trackingUrl =
              typeof window !== "undefined"
                ? getTrackingUrl(order.tracking_code, window.location.origin)
                : getTrackingUrl(order.tracking_code);

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-900">
                      {order.customer_name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-amber-800">
                      {formatPrice(order.total_amount)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      No. Pesanan: {formatOrderNumber(order.id)} · Ditempah:{" "}
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">
                    Pautan Jejak Pesanan
                  </p>
                  <p className="mt-2 break-all text-sm text-stone-800">
                    {trackingUrl}
                  </p>
                  <div className="mt-3">
                    <CopyButton
                      text={trackingUrl}
                      label="Copy Tracking Link"
                      copiedLabel="Link Disalin!"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">
                    Pakej Ditempah
                  </p>
                  <div className="mt-3 space-y-2">
                    {(order.order_items ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-stone-900">
                            {item.product_name}
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
                  <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
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
                    <div className="flex justify-between font-semibold text-stone-900">
                      <dt>Jumlah</dt>
                      <dd>{formatPrice(order.total_amount)}</dd>
                    </div>
                  </dl>
                </div>

                <dl className="mt-4 grid gap-2 text-sm text-stone-700">
                  <div>
                    <dt className="font-medium text-stone-500">WhatsApp</dt>
                    <dd>
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-amber-700 underline"
                        >
                          {order.whatsapp_number}
                        </a>
                      ) : (
                        <span className="break-all">{order.whatsapp_number}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-stone-500">Alamat</dt>
                    <dd className="break-words">{order.delivery_address}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-stone-500">
                      Tarikh Penghantaran
                    </dt>
                    <dd>{formatDeliveryDateMY(order.delivery_date)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-stone-500">
                      Masa Penghantaran
                    </dt>
                    <dd>{formatDeliveryTimePreference(order)}</dd>
                  </div>
                  {order.notes ? (
                    <div>
                      <dt className="font-medium text-stone-500">Nota</dt>
                      <dd className="break-words">{order.notes}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-stone-500">Bayaran</dt>
                    <dd>COD</dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-stone-700">
                    Nota Penghantaran (untuk pelanggan)
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryNotes[order.id] ?? ""}
                    maxLength={MAX_DELIVERY_NOTE_LENGTH}
                    onChange={(event) =>
                      setDeliveryNotes((current) => ({
                        ...current,
                        [order.id]: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Rider akan sampai selepas 3pm"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  <button
                    type="button"
                    disabled={savingNoteId === order.id}
                    onClick={() => void saveDeliveryNote(order.id)}
                    className="min-h-11 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingNoteId === order.id ? "Menyimpan..." : "Simpan Nota"}
                  </button>
                </div>

                {nextStatuses.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {nextStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => void updateStatus(order.id, status)}
                        className="min-h-11 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-50"
                      >
                        {ORDER_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

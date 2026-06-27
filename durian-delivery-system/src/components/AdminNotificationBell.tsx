"use client";

import { useEffect, useRef, useState } from "react";
import { formatDeliveryDateMY } from "@/lib/delivery";
import { formatOrderItemsSummary } from "@/lib/admin-filters";
import { formatDeliveryTimePreference } from "@/lib/labels";
import { formatPrice } from "@/lib/products";
import type { Order } from "@/lib/types";
import { formatOrderNumber } from "@/lib/tracking";

type AdminNotificationBellProps = {
  unreadOrders: Order[];
  onMarkSeen: (orderId: string) => void;
  onSelectOrder: (orderId: string) => void;
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminNotificationBell({
  unreadOrders,
  onMarkSeen,
  onSelectOrder,
}: AdminNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(order: Order) {
    onMarkSeen(order.id);
    onSelectOrder(order.id);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50"
        aria-label="Order notifications"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9"
          />
        </svg>
        {unreadOrders.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadOrders.length > 99 ? "99+" : unreadOrders.length}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <div className="border-b border-stone-200 px-4 py-3">
            <p className="text-sm font-semibold text-stone-900">Pesanan Baharu</p>
            <p className="text-xs text-stone-500">
              {unreadOrders.length === 0
                ? "Tiada pesanan belum dibaca"
                : `${unreadOrders.length} pesanan belum dibaca`}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {unreadOrders.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-stone-500">
                Semua pesanan telah dibaca.
              </p>
            ) : (
              unreadOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => handleSelect(order)}
                  className="block w-full border-b border-stone-100 px-4 py-3 text-left transition hover:bg-amber-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-900">
                      {formatOrderNumber(order.id)} · {order.customer_name}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-amber-800">
                      {formatPrice(order.total_amount)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    {formatOrderItemsSummary(order)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDeliveryDateMY(order.delivery_date)} ·{" "}
                    {formatDeliveryTimePreference(order)}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {formatCreatedAt(order.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

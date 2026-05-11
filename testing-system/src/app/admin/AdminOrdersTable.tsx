"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOrderStatus } from "@/actions/admin";
import type { OrderItemRow, OrderRow, OrderStatus } from "@/types";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/types";

type AdminRow = { order: OrderRow; items: OrderItemRow[] };

type Props = {
  rows: AdminRow[];
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemsSummary(items: OrderItemRow[]) {
  return items
    .map((i) => `${i.product?.name ?? "Item"} ×${i.quantity}`)
    .join(", ");
}

export function AdminOrdersTable({ rows }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onStatusChange(orderId: string, status: OrderStatus) {
    setError(null);
    setPendingId(orderId);
    const res = await updateOrderStatus(orderId, status);
    setPendingId(null);
    if (!res.ok) {
      setError(res.error ?? "Update failed");
      return;
    }
    router.refresh();
  }

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-drive-line bg-drive-surface px-4 py-8 text-center text-sm text-drive-muted">
        No orders yet. Customer checkouts will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-drive-line bg-drive-surface">
        <table className="min-w-[56rem] text-left text-sm">
          <thead className="border-b border-drive-line bg-drive-bg text-xs uppercase text-drive-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Arrived</th>
              <th className="px-3 py-3 font-medium">When</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Items</th>
              <th className="px-3 py-3 font-medium">At pickup</th>
              <th className="px-3 py-3 font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-drive-line">
            {rows.map(({ order: o, items }) => (
              <tr
                key={o.id}
                className={`align-top ${
                  o.arrived
                    ? "bg-amber-50 ring-1 ring-inset ring-amber-300/80"
                    : ""
                }`}
              >
                <td className="px-3 py-3">
                  {o.arrived ? (
                    <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                      Here
                    </span>
                  ) : (
                    <span className="text-drive-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-drive-muted">
                  {formatTime(o.created_at)}
                  {o.arrived_at ? (
                    <span className="mt-1 block text-xs text-amber-900/80">
                      Here: {formatTime(o.arrived_at)}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-medium text-drive-ink">{o.customer_name}</td>
                <td className="px-3 py-3 text-drive-ink">{o.phone}</td>
                <td className="max-w-[14rem] px-3 py-3 text-xs leading-relaxed text-drive-ink">
                  {itemsSummary(items)}
                </td>
                <td className="px-3 py-3 text-xs">
                  {o.arrived ? (
                    <div className="space-y-1 text-drive-ink">
                      <div>
                        <span className="text-drive-muted">Plate </span>
                        <span className="font-mono font-semibold">{o.arrival_car_plate}</span>
                      </div>
                      <div>
                        <span className="text-drive-muted">Color </span>
                        <span className="font-medium">{o.arrival_car_color}</span>
                      </div>
                      <div className="text-drive-muted">
                        <span className="block text-[10px] uppercase">Spot / note</span>
                        <span className="font-medium text-drive-ink">{o.arrival_location_note}</span>
                      </div>
                      <div className="border-t border-amber-200/80 pt-1 text-[10px] text-drive-muted">
                        Checkout plate:{" "}
                        <span className="font-mono text-drive-ink">{o.car_plate}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-drive-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold">${Number(o.total).toFixed(2)}</td>
                <td className="px-3 py-3">
                  <select
                    value={o.status}
                    disabled={pendingId === o.id}
                    onChange={(e) => onStatusChange(o.id, e.target.value as OrderStatus)}
                    className="w-full min-w-[9rem] rounded-lg border border-drive-line bg-drive-bg px-2 py-1.5 text-sm font-medium"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

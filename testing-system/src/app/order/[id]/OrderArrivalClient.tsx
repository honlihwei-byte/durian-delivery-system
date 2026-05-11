"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordCustomerArrival } from "@/actions/orders";
import type { OrderRow } from "@/types";
import { ORDER_STATUS_LABEL } from "@/types";

type Props = {
  order: OrderRow;
};

export function OrderArrivalClient({ order }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [carPlate, setCarPlate] = useState(order.arrival_car_plate ?? order.car_plate);
  const [carColor, setCarColor] = useState(order.arrival_car_color ?? "");
  const [locationNote, setLocationNote] = useState(order.arrival_location_note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCheckIn =
    order.status !== "completed" && ["paid", "preparing", "ready"].includes(order.status);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await recordCustomerArrival(order.id, {
      carPlate,
      carColor,
      locationNote,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-drive-accent/25 bg-drive-accent/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-drive-accent">Tracking</p>
        <p className="mt-1 text-lg font-semibold text-drive-ink">Payment received</p>
        <p className="mt-1 text-sm text-drive-muted">
          Kitchen status:{" "}
          <span className="font-medium text-drive-ink">{ORDER_STATUS_LABEL[order.status]}</span>
        </p>
        {canCheckIn ? (
          <p className="mt-3 text-sm text-drive-muted">
            When you reach the pickup lane, tap <span className="font-medium text-drive-ink">I&apos;m Here</span> so
            staff can find your vehicle.
          </p>
        ) : order.status === "completed" && !order.arrived ? (
          <p className="mt-3 text-sm text-drive-muted">
            This order is already marked complete. If you still need help, please call the store.
          </p>
        ) : null}
      </section>

      {order.arrived ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
          <p className="text-sm font-semibold text-emerald-900">You&apos;re checked in</p>
          <p className="mt-1 text-sm text-emerald-800">
            We notified the team. Pull forward when your order is ready.
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-emerald-950">
            <div className="flex justify-between gap-2">
              <dt className="text-emerald-800">Plate</dt>
              <dd className="font-mono font-medium">{order.arrival_car_plate}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-emerald-800">Color</dt>
              <dd className="font-medium">{order.arrival_car_color}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-emerald-200/80 pt-2">
              <dt className="text-emerald-800">Spot / note</dt>
              <dd className="max-w-[60%] text-right font-medium">{order.arrival_location_note}</dd>
            </div>
          </dl>
        </section>
      ) : canCheckIn ? (
        <section className="rounded-2xl border border-drive-line bg-drive-surface p-5">
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full rounded-xl border-2 border-drive-accent bg-drive-surface py-3 text-sm font-semibold text-drive-accent transition hover:bg-drive-accent/5"
            >
              I&apos;m Here
            </button>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-sm font-semibold text-drive-ink">Confirm your vehicle</h2>
              <p className="text-xs text-drive-muted">
                Staff use this to spot you in the lot or lane.
              </p>
              <div>
                <label htmlFor="arr-plate" className="block text-sm font-medium text-drive-ink">
                  Car plate number
                </label>
                <input
                  id="arr-plate"
                  required
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-drive-line px-3 py-2.5 font-mono text-sm uppercase outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="arr-color" className="block text-sm font-medium text-drive-ink">
                  Car color
                </label>
                <input
                  id="arr-color"
                  required
                  value={carColor}
                  onChange={(e) => setCarColor(e.target.value)}
                  placeholder="e.g. Silver, black"
                  className="mt-1 w-full rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="arr-spot" className="block text-sm font-medium text-drive-ink">
                  Parking spot or short location note
                </label>
                <input
                  id="arr-spot"
                  required
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="e.g. Spot 4, second lane, near exit"
                  className="mt-1 w-full rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="flex-1 rounded-xl border border-drive-line py-2.5 text-sm font-medium text-drive-ink hover:bg-drive-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-drive-accent py-2.5 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Notify staff"}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}

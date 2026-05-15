"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SessionLogoutButton } from "@/components/SessionLogoutButton";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getDriverProgress,
  getOrdersForDriver,
  getOrdersForDriverOnRoute,
  getOrdersForRoute,
  getRouteCompletionLabel,
  getRouteProgress,
  getRoutesForDriver,
  getStopTimeMetrics,
} from "@/lib/delivery-dashboard";
import {
  getDeliveryStoreSnapshot,
  recordOrderAction,
  recordTripStart,
} from "@/lib/delivery-demo-storage";
import { getCurrentSession, isDriverSession } from "@/lib/demo-session";
import {
  DELIVERY_STATUS_LABEL,
  PHOTO_NEED_LABEL,
  type DeliveryOrderRow,
  type DeliveryRouteRow,
  type DeliveryStatus,
  type DeliveryStore,
} from "@/types/delivery";

type PendingPhoto = {
  name: string;
  dataUrl: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value: number | null) {
  if (value === null) return "N/A";
  return `${value} min`;
}

function getGoogleMapsHref(order: DeliveryOrderRow) {
  if (order.googleMapsLink) {
    return order.googleMapsLink;
  }

  const query = [order.customerName, order.address].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function statusClasses(status: DeliveryStatus) {
  if (status === "delivered") {
    return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }
  if (status === "arrived") {
    return "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200";
  }
  if (status === "failed") {
    return "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function actionButtonClasses(tone: "primary" | "neutral" | "danger" | "success") {
  if (tone === "primary") {
    return "bg-drive-accent text-white hover:bg-drive-accentMuted";
  }
  if (tone === "danger") {
    return "bg-red-600 text-white hover:bg-red-700";
  }
  if (tone === "success") {
    return "bg-emerald-600 text-white hover:bg-emerald-700";
  }
  return "border border-drive-line bg-white text-drive-ink hover:bg-drive-bg";
}

function canTakeAction(order: DeliveryOrderRow, action: "arrived" | "delivered" | "failed") {
  if (action === "arrived") {
    return order.status === "pending";
  }
  if (action === "delivered") {
    return order.status !== "delivered" && order.status !== "failed";
  }
  return order.status !== "delivered" && order.status !== "failed";
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Photo read failed"));
    reader.readAsDataURL(file);
  });
}

export function DriverMobileClient() {
  const router = useRouter();
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, string>>({});
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, PendingPhoto | undefined>>({});

  useEffect(() => {
    const load = () => {
      const session = getCurrentSession();
      if (!isDriverSession(session)) {
        router.replace("/login?role=driver&next=/driver");
        return;
      }
      setStore(getDeliveryStoreSnapshot(session.companyId));
      setChecked(true);
    };

    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [router]);

  const session = getCurrentSession();
  const currentDriver =
    store && isDriverSession(session)
      ? store.drivers.find((driver) => driver.id === session.driverId) ?? null
      : null;
  const assignedRoutes = useMemo(
    () => (store && currentDriver ? getRoutesForDriver(store, currentDriver.id) : []),
    [currentDriver, store]
  );
  const assignedStops = useMemo(
    () => (store && currentDriver ? getOrdersForDriver(store, currentDriver.id) : []),
    [currentDriver, store]
  );
  const driverProgress = useMemo(
    () =>
      store && currentDriver
        ? getDriverProgress(store, currentDriver.id)
        : {
            routeCount: 0,
            totalStops: 0,
            pending: 0,
            arrived: 0,
            delivered: 0,
            failed: 0,
            completionPercent: 0,
            activeStops: 0,
            startedAt: null,
            lastEventAt: null,
            hasGps: false,
          },
    [currentDriver, store]
  );

  async function handleTripStart(routeId: string) {
    if (!currentDriver) return;
    const session = getCurrentSession();
    if (!isDriverSession(session)) return;
    setError(null);
    setBusyKey(`trip-${routeId}`);
    const result = await recordTripStart(session.companyId, routeId, currentDriver.id);
    setBusyKey(null);
    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }
    setStore(result.store);
  }

  async function handleOrderAction(orderId: string, action: "arrived" | "delivered" | "failed" | "remark") {
    if (!currentDriver) return;
    const session = getCurrentSession();
    if (!isDriverSession(session)) return;
    setError(null);
    setBusyKey(`${orderId}-${action}`);
    const pendingPhoto = photoDrafts[orderId];
    const result = await recordOrderAction({
      companyId: session.companyId,
      orderId,
      driverId: currentDriver.id,
      action,
      remark: remarkDrafts[orderId],
      photoDataUrl: pendingPhoto?.dataUrl ?? null,
      photoName: pendingPhoto?.name ?? null,
    });
    setBusyKey(null);

    if (!result.ok) {
      setError(result.error);
      if (result.store) setStore(result.store);
      return;
    }

    setStore(result.store);
    setRemarkDrafts((current) => ({ ...current, [orderId]: "" }));
    setPhotoDrafts((current) => ({ ...current, [orderId]: undefined }));
  }

  async function handlePhotoPick(orderId: string, file: File | null) {
    if (!file) {
      setPhotoDrafts((current) => ({ ...current, [orderId]: undefined }));
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoDrafts((current) => ({
        ...current,
        [orderId]: { name: file.name, dataUrl },
      }));
    } catch {
      setError("Could not attach the selected photo.");
    }
  }

  function renderOrderCard(route: DeliveryRouteRow, order: DeliveryOrderRow) {
    const metrics = getStopTimeMetrics(order);
    const latestPhoto =
      photoDrafts[order.id]?.dataUrl ??
      [...order.events]
        .reverse()
        .find((event) => event.photoDataUrl)?.photoDataUrl ??
      null;

    return (
      <article key={order.id} className="rounded-2xl border border-drive-line bg-drive-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">
              {route.routeName} · Stop {order.stopNumber} · {order.orderNumber}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-drive-ink">{order.customerName}</h2>
            <p className="mt-1 text-sm leading-relaxed text-drive-muted">{order.address}</p>
          </div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(order.status)}`}>
            {DELIVERY_STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-drive-bg px-2.5 py-1 text-xs font-medium text-drive-ink">
            {order.area}
          </span>
          <span className="rounded-full bg-drive-bg px-2.5 py-1 text-xs font-medium text-drive-ink">
            {order.contactNumber}
          </span>
          <a
            href={getGoogleMapsHref(order)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-drive-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-drive-accentMuted"
          >
            Open in Google Maps
          </a>
          {(order.photoNeedReasons ?? []).map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
            >
              {PHOTO_NEED_LABEL[reason]}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-2 text-sm text-drive-ink">
          <div className="flex justify-between gap-4">
            <span className="text-drive-muted">Last update</span>
            <span className="text-right font-medium">{formatDateTime(order.updatedAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-drive-muted">Delivery time</span>
            <span className="text-right font-medium">{formatMinutes(metrics.arrivalToDeliveryMinutes)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-drive-muted">Time at stop</span>
            <span className="text-right font-medium">{formatMinutes(metrics.totalTimeAtStopMinutes)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-drive-muted">Delay time</span>
            <span className="text-right font-medium">{formatMinutes(metrics.delayMinutes)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-drive-muted">GPS</span>
            <span className="text-right font-medium">
              {order.latestLocation.source === "browser"
                ? `${order.latestLocation.latitude}, ${order.latestLocation.longitude}`
                : "Missing GPS"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-drive-muted">Saved map point</span>
            <span className="text-right font-medium">
              {order.latitude !== null && order.longitude !== null
                ? `${order.latitude}, ${order.longitude}`
                : "Address search fallback"}
            </span>
          </div>
          {order.remark ? (
            <div className="rounded-xl bg-drive-bg px-3 py-2 text-sm">
              <span className="font-semibold text-drive-ink">Latest remark:</span> {order.remark}
            </div>
          ) : null}
          {order.notes ? (
            <div className="rounded-xl bg-drive-bg px-3 py-2 text-sm">
              <span className="font-semibold text-drive-ink">Stop note:</span> {order.notes}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-drive-line bg-drive-bg p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-drive-ink">Optional photo</p>
              <p className="text-xs text-drive-muted">
                Upload only if needed. Photo is recommended on flagged orders.
              </p>
            </div>
            <label className="inline-flex cursor-pointer rounded-lg border border-drive-line bg-white px-3 py-2 text-xs font-semibold text-drive-ink">
              Choose Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handlePhotoPick(order.id, event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {photoDrafts[order.id]?.name ? (
            <p className="mt-2 text-xs font-medium text-drive-accent">Ready to save: {photoDrafts[order.id]?.name}</p>
          ) : null}
          {latestPhoto ? (
            <Image
              src={latestPhoto}
              alt={`Optional proof for ${order.customerName}`}
              width={640}
              height={224}
              unoptimized
              className="mt-3 h-28 w-full rounded-xl object-cover"
            />
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canTakeAction(order, "arrived") || busyKey === `${order.id}-arrived`}
            onClick={() => void handleOrderAction(order.id, "arrived")}
            className={`rounded-xl px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonClasses(
              "neutral"
            )}`}
          >
            {busyKey === `${order.id}-arrived` ? "Saving..." : "Arrived"}
          </button>
          <button
            type="button"
            disabled={!canTakeAction(order, "delivered") || busyKey === `${order.id}-delivered`}
            onClick={() => void handleOrderAction(order.id, "delivered")}
            className={`rounded-xl px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonClasses(
              "success"
            )}`}
          >
            {busyKey === `${order.id}-delivered` ? "Saving..." : "Delivered"}
          </button>
          <button
            type="button"
            disabled={!canTakeAction(order, "failed") || busyKey === `${order.id}-failed`}
            onClick={() => void handleOrderAction(order.id, "failed")}
            className={`rounded-xl px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonClasses(
              "danger"
            )}`}
          >
            {busyKey === `${order.id}-failed` ? "Saving..." : "Failed"}
          </button>
          <button
            type="button"
            disabled={busyKey === `${order.id}-remark`}
            onClick={() => void handleOrderAction(order.id, "remark")}
            className={`rounded-xl px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonClasses(
              "primary"
            )}`}
          >
            {busyKey === `${order.id}-remark` ? "Saving..." : "Add Remark"}
          </button>
        </div>

        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Remark</label>
          <textarea
            rows={3}
            value={remarkDrafts[order.id] ?? ""}
            onChange={(event) =>
              setRemarkDrafts((current) => ({
                ...current,
                [order.id]: event.target.value,
              }))
            }
            placeholder="Gate closed, customer asked for side entrance, broken crate, etc."
            className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm text-drive-ink outline-none ring-drive-accent/30 focus:ring-2"
          />
        </div>
      </article>
    );
  }

  const driverHeaderSubtitle = isDriverSession(session)
    ? `${session.name} · ${session.companyName} · ${session.companyCode}`
    : "Driver mobile page";

  if (!checked || !store || !currentDriver) {
    return (
      <div className="min-h-screen bg-drive-bg">
        <SiteHeader title="Driver Delivery Check-in" subtitle={driverHeaderSubtitle} />
        <main className="mx-auto max-w-xl px-4 py-10 text-center text-drive-muted sm:px-6">
          Loading today&apos;s assigned route...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drive-bg">
      <SiteHeader
        title="Driver Delivery Check-in"
        subtitle={driverHeaderSubtitle}
        right={
          <SessionLogoutButton className="rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg" />
        }
      />

      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-5 sm:px-6">
        <section className="rounded-2xl border border-drive-line bg-drive-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">Today&apos;s assignments</p>
              <h1 className="mt-1 text-xl font-semibold text-drive-ink">{currentDriver.name}</h1>
              <p className="text-sm text-drive-muted">
                {currentDriver.vehicle} · {currentDriver.zone}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                driverProgress.failed > 0
                  ? "failed"
                  : driverProgress.arrived > 0
                    ? "arrived"
                    : driverProgress.delivered > 0
                      ? "delivered"
                      : "pending"
              )}`}
            >
              {assignedRoutes.length === 0
                ? "No route assigned"
                : `${assignedRoutes.length} assigned route${assignedRoutes.length > 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-drive-bg p-3">
              <p className="text-xs uppercase text-drive-muted">Routes</p>
              <p className="mt-1 text-lg font-semibold text-drive-ink">{assignedRoutes.length}</p>
            </div>
            <div className="rounded-xl bg-drive-bg p-3">
              <p className="text-xs uppercase text-drive-muted">Pending</p>
              <p className="mt-1 text-lg font-semibold text-drive-ink">{driverProgress.pending}</p>
            </div>
            <div className="rounded-xl bg-drive-bg p-3">
              <p className="text-xs uppercase text-drive-muted">Arrived</p>
              <p className="mt-1 text-lg font-semibold text-amber-700">{driverProgress.arrived}</p>
            </div>
            <div className="rounded-xl bg-drive-bg p-3">
              <p className="text-xs uppercase text-drive-muted">Delivered</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{driverProgress.delivered}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-drive-muted">
            {assignedStops.length} assigned stops today · Last update {formatDateTime(driverProgress.lastEventAt)}
          </p>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
        </section>

        <section className="space-y-4">
          {assignedRoutes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-drive-line bg-drive-surface p-6 text-center">
              <p className="text-lg font-semibold text-drive-ink">No route assigned today</p>
              <p className="mt-2 text-sm text-drive-muted">
                Ask admin to assign a route to your driver account before starting delivery.
              </p>
            </div>
          ) : null}

          {assignedRoutes.map((route) => {
            const routeOrders = getOrdersForDriverOnRoute(store, currentDriver.id, route.id);
            const routeProgress = getRouteProgress(store, route.id);

            return (
              <div key={route.id} className="space-y-4">
                <section className="rounded-2xl border border-drive-line bg-drive-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">
                        Today&apos;s assigned route
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-drive-ink">{route.routeName}</h2>
                      <p className="text-sm text-drive-muted">
                        {route.routeDate} · {routeOrders.length} of {getOrdersForRoute(store, route.id).length} stops assigned to you
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(
                      routeProgress.failed > 0
                        ? "failed"
                        : routeProgress.arrived > 0
                          ? "arrived"
                          : routeProgress.delivered > 0
                            ? "delivered"
                            : "pending"
                    )}`}>
                      {getRouteCompletionLabel(route, {
                        activeStops: routeProgress.pending + routeProgress.arrived,
                        totalStops: routeProgress.totalStops,
                      })}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-drive-line bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-drive-ink">Start Trip</p>
                        <p className="text-xs text-drive-muted">Started: {formatDateTime(route.startedAt)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(route.startedAt) || busyKey === `trip-${route.id}`}
                        onClick={() => void handleTripStart(route.id)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonClasses(
                          "primary"
                        )}`}
                      >
                        {busyKey === `trip-${route.id}` ? "Saving..." : route.startedAt ? "Trip Started" : "Start Trip"}
                      </button>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-drive-line">
                      <div
                        className="h-full rounded-full bg-drive-accent transition-all"
                        style={{ width: `${routeProgress.completionPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-drive-muted">
                      {routeProgress.completionPercent}% completed · Last update {formatDateTime(route.lastEventAt)}
                    </p>
                  </div>
                </section>

                {routeOrders.map((order) => renderOrderCard(route, order))}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

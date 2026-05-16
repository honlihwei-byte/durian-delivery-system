"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/Toast";
import { buildAttendanceEventFields } from "@/lib/attendance-event-time";
import { getStaffPosition } from "@/lib/geolocation-client";

type ClockStaffOption = {
  id: string;
  staff_name: string;
  staff_code: string;
};

export function ClockScreen({ shopId }: { shopId: string }) {
  const [shopName, setShopName] = useState<string>("");
  const [shopStaff, setShopStaff] = useState<ClockStaffOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [useManualCode, setUseManualCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsChecking, setGpsChecking] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const requestGps = useCallback(async () => {
    setGpsChecking(true);
    setGpsError(null);
    setGpsReady(false);
    try {
      await getStaffPosition();
      setGpsReady(true);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : "Could not get location");
    } finally {
      setGpsChecking(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shopRes, staffRes] = await Promise.all([
        fetch(`/api/shops/${shopId}`),
        fetch(`/api/shops/${shopId}/staff`),
      ]);
      if (!shopRes.ok) {
        const j = await shopRes.json().catch(() => ({}));
        throw new Error(j.error || "Shop not found");
      }
      const shopJson = await shopRes.json();
      setShopName(shopJson.shop?.name ?? "Shop");

      if (staffRes.ok) {
        const staffJson = await staffRes.json();
        const list = (staffJson.staff ?? []) as ClockStaffOption[];
        setShopStaff(list);
        setSelectedStaffId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? "",
        );
      } else {
        setShopStaff([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => void requestGps(), 0);
    return () => window.clearTimeout(t);
  }, [requestGps]);

  async function punch(action_type: "clock_in" | "clock_out") {
    const manual = identifier.trim();
    const staffId = useManualCode ? "" : selectedStaffId;

    if (!useManualCode && !staffId) {
      setError("Select your name from the list.");
      return;
    }
    if (useManualCode && !manual) {
      setError("Scan your ID card or enter your staff code.");
      return;
    }

    setBusy(true);
    setToast(null);
    setError(null);
    try {
      const { latitude, longitude } = await getStaffPosition();
      const { event_date, event_time } = buildAttendanceEventFields();

      const body: Record<string, unknown> = {
        shop_id: shopId,
        action_type,
        event_date,
        event_time,
        client_device_time: new Date().toISOString(),
        staff_latitude: latitude,
        staff_longitude: longitude,
      };
      if (useManualCode) body.staff_identifier = manual;
      else body.staff_id = staffId;

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not save");
      }
      const savedTime = String(data.event_time ?? event_time);
      setToast(
        action_type === "clock_in"
          ? `Clocked in at ${savedTime}`
          : `Clocked out at ${savedTime}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const clockDisabled = busy || gpsChecking || !gpsReady;

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error && !shopName) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:py-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Clock</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{shopName}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Allow location, identify yourself, then tap Clock In or Clock Out.
        </p>
      </header>

      <section
        className={`rounded-xl border px-4 py-3 text-sm ${
          gpsReady
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            : gpsError
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
        }`}
        aria-live="polite"
      >
        <p className="font-medium">Please allow location permission to clock in/out</p>
        {gpsChecking ? (
          <p className="mt-1 text-xs opacity-90">Checking your location…</p>
        ) : gpsReady ? (
          <p className="mt-1 text-xs opacity-90">Location ready. You can clock in or out.</p>
        ) : gpsError ? (
          <>
            <p className="mt-1 text-xs opacity-90">{gpsError}</p>
            <button
              type="button"
              onClick={() => void requestGps()}
              className="mt-3 w-full rounded-lg border border-current px-3 py-2 text-sm font-semibold"
            >
              Allow location again
            </button>
          </>
        ) : null}
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-lg border px-3 py-2 font-medium ${
              !useManualCode
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-600"
            }`}
            onClick={() => setUseManualCode(false)}
          >
            Select name
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg border px-3 py-2 font-medium ${
              useManualCode
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-600"
            }`}
            onClick={() => setUseManualCode(true)}
          >
            Staff code / card
          </button>
        </div>

        {!useManualCode ? (
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Your name
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-600 dark:bg-zinc-900"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={shopStaff.length === 0}
            >
              {shopStaff.length === 0 ? (
                <option value="">No staff assigned to this shop</option>
              ) : (
                shopStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.staff_name} ({s.staff_code})
                  </option>
                ))
              )}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Staff code or ID card value
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-3 font-mono text-base dark:border-zinc-600 dark:bg-zinc-900"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. PC000001"
              autoCapitalize="characters"
              autoCorrect="off"
              inputMode="text"
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={clockDisabled || (!useManualCode && shopStaff.length === 0)}
          onClick={() => void punch("clock_in")}
          className="rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {busy ? "Working…" : "Clock In"}
        </button>
        <button
          type="button"
          disabled={clockDisabled || (!useManualCode && shopStaff.length === 0)}
          onClick={() => void punch("clock_out")}
          className="rounded-xl bg-zinc-800 py-4 text-lg font-semibold text-white shadow-sm disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
        >
          {busy ? "Working…" : "Clock Out"}
        </button>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

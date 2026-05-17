"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LocationStatusCard } from "@/components/LocationStatusCard";
import { Toast } from "@/components/Toast";
import {
  getVerifiedGpsForPunch,
  isGpsVerifiedForPunch,
  startClockGpsVerification,
  subscribeClockGpsVerify,
} from "@/lib/clock-verified-gps";
import type { ShopForPunch } from "@/lib/gps-shop-verify";
import { isValidShopId } from "@/lib/shop-id";
import { isPunchTimingEnabled, punchMark, punchTime, punchTimeStart } from "@/lib/punch-timing";
import { ClockScreenSkeleton } from "./ClockScreenSkeleton";

type ClockStaffOption = {
  id: string;
  staff_name: string;
  staff_code: string;
};

const STAFF_CACHE_KEY = (shopId: string) => `punch-staff-${shopId}`;
const ENRICH_DELAY_MS_MIN = 3000;
const ENRICH_DELAY_MS_MAX = 5000;
const PUNCH_COOLDOWN_MS = 2500;
const GPS_START_DELAY_MS = 150;

function readStaffCache(shopId: string): ClockStaffOption[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STAFF_CACHE_KEY(shopId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClockStaffOption[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStaffCache(shopId: string, staff: ClockStaffOption[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STAFF_CACHE_KEY(shopId), JSON.stringify(staff));
  } catch {
    /* ignore */
  }
}

function enrichDelayMs(): number {
  return (
    ENRICH_DELAY_MS_MIN +
    Math.floor(Math.random() * (ENRICH_DELAY_MS_MAX - ENRICH_DELAY_MS_MIN + 1))
  );
}

function scheduleBackgroundEnrich(
  attendanceId: string,
  shopId: string,
  accuracyMeters: number,
) {
  const delay = enrichDelayMs();
  window.setTimeout(() => {
    void fetch(`/api/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: shopId,
        mode: "enrich",
        gps_accuracy_meters: Math.round(accuracyMeters * 100) / 100,
        client_device_time: new Date().toISOString(),
      }),
    }).catch(() => {
      /* non-blocking */
    });
  }, delay);
}

function subscribeGpsVerified(listener: () => void): () => void {
  return subscribeClockGpsVerify(listener);
}

function getGpsVerifiedSnapshot(): boolean {
  return isGpsVerifiedForPunch();
}

export function ClockScreen({ shopId }: { shopId: string }) {
  const validShopId = isValidShopId(shopId);

  const [shopName, setShopName] = useState("");
  const [shopForPunch, setShopForPunch] = useState<ShopForPunch | null>(null);
  const [shopStaff, setShopStaff] = useState<ClockStaffOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [useManualCode, setUseManualCode] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGpsCard, setShowGpsCard] = useState(false);
  const [punched, setPunched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);

  const punchLockRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const hasStartedGpsRef = useRef(false);
  const stopGpsRef = useRef<(() => void) | null>(null);
  const gpsStartTimerRef = useRef<number | null>(null);

  const gpsVerified = useSyncExternalStore(
    subscribeGpsVerified,
    getGpsVerifiedSnapshot,
    () => false,
  );

  const load = useCallback(async () => {
    if (!validShopId) {
      setLoadError("Invalid shop link.");
      setPageLoading(false);
      return;
    }

    setLoadError(null);
    setPageLoading(true);
    const t0 = punchTimeStart();

    try {
      const [shopRes, staffRes] = await Promise.all([
        fetch(`/api/shops/${encodeURIComponent(shopId)}`),
        fetch(`/api/shops/${encodeURIComponent(shopId)}/staff`),
      ]);
      punchTime("load shop+staff API", t0);

      if (!shopRes.ok) {
        const j = await shopRes.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Shop not found");
      }

      const shopJson = (await shopRes.json()) as { shop?: Record<string, unknown> };
      const shop = shopJson.shop;
      const name = typeof shop?.name === "string" ? shop.name : "Shop";
      setShopName(name);

      const lat = typeof shop?.latitude === "number" ? shop.latitude : null;
      const lng = typeof shop?.longitude === "number" ? shop.longitude : null;

      if (lat != null && lng != null) {
        setShopForPunch({
          id: shopId,
          name,
          latitude: lat,
          longitude: lng,
          allowed_radius_meters:
            typeof shop?.allowed_radius_meters === "number"
              ? shop.allowed_radius_meters
              : 50,
        });
      } else {
        setShopForPunch(null);
        setLoadError("This shop has no GPS location configured. Contact your manager.");
      }

      if (staffRes.ok) {
        const staffJson = (await staffRes.json()) as { staff?: ClockStaffOption[] };
        const list = Array.isArray(staffJson.staff) ? staffJson.staff : [];
        setShopStaff(list);
        writeStaffCache(shopId, list);
        setSelectedStaffId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0]?.id ?? "",
        );
      } else {
        const cached = readStaffCache(shopId);
        setShopStaff(cached);
        setSelectedStaffId(cached[0]?.id ?? "");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load clock page");
      setShopForPunch(null);
    } finally {
      setPageLoading(false);
    }
  }, [shopId, validShopId]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const cached = readStaffCache(shopId);
    if (cached.length) {
      setShopStaff(cached);
      setSelectedStaffId(cached[0]?.id ?? "");
    }
    void load();
  }, [load, shopId]);

  const shopPunchId = shopForPunch?.id ?? null;
  const shopForPunchRef = useRef(shopForPunch);
  shopForPunchRef.current = shopForPunch;

  useEffect(() => {
    const shop = shopForPunchRef.current;
    if (!shopPunchId || !shop) return;
    if (hasStartedGpsRef.current) return;
    hasStartedGpsRef.current = true;
    gpsStartTimerRef.current = window.setTimeout(() => {
      try {
        stopGpsRef.current = startClockGpsVerification(shop);
        setShowGpsCard(true);
      } catch (e) {
        console.error("[clock] GPS start failed", e);
        hasStartedGpsRef.current = false;
      }
    }, GPS_START_DELAY_MS);

    return () => {
      if (gpsStartTimerRef.current != null) {
        window.clearTimeout(gpsStartTimerRef.current);
        gpsStartTimerRef.current = null;
      }
      stopGpsRef.current?.();
      stopGpsRef.current = null;
      hasStartedGpsRef.current = false;
      setShowGpsCard(false);
    };
  }, [shopPunchId]);

  const dismissToast = useCallback(() => setToast(null), []);

  async function postFastAttendance(
    verified: ReturnType<typeof getVerifiedGpsForPunch>,
    action_type: "clock_in" | "clock_out",
    staffId: string,
    manual: string,
  ) {
    const body: Record<string, unknown> = {
      shop_id: shopId,
      action_type,
      fast_punch: true,
      gps_verified: true,
      staff_latitude: verified.latitude,
      staff_longitude: verified.longitude,
      distance_from_shop_meters: verified.distanceMeters,
      gps_accuracy_meters: Math.round(verified.accuracyMeters * 100) / 100,
    };
    if (useManualCode) body.staff_identifier = manual;
    else body.staff_id = staffId;

    punchMark("API POST /api/attendance (fast) start");
    const apiStart = punchTimeStart();
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      id?: string;
      _timings?: unknown;
    };
    punchTime("API POST /api/attendance (fast) end", apiStart);

    if (isPunchTimingEnabled() && data._timings) {
      console.log("[punch-timing] server timings", data._timings);
    }

    if (!res.ok) {
      throw new Error(data.error || "Could not save");
    }
    return data as { id: string; event_time?: string };
  }

  async function punch(action_type: "clock_in" | "clock_out") {
    if (punchLockRef.current || punched || !gpsVerified) return;

    const manual = identifier.trim();
    const staffId = useManualCode ? "" : selectedStaffId;

    if (!useManualCode && !staffId) {
      setPunchError("Select your name from the list.");
      return;
    }
    if (useManualCode && !manual) {
      setPunchError("Scan your ID card or enter your staff code.");
      return;
    }

    punchLockRef.current = true;
    setPunched(true);
    setToast(null);
    setPunchError(null);

    const totalStart = punchTimeStart();
    punchMark("punch total start (verified GPS, no new request)");

    try {
      const verified = getVerifiedGpsForPunch();
      const data = await postFastAttendance(verified, action_type, staffId, manual);
      setToast("Punch saved");
      punchTime("punch total", totalStart);
      scheduleBackgroundEnrich(data.id, shopId, verified.accuracyMeters);
    } catch (e) {
      setPunchError(e instanceof Error ? e.message : "Could not save punch");
      setPunched(false);
      punchLockRef.current = false;
      punchTime("punch total (failed)", totalStart);
      return;
    }

    window.setTimeout(() => {
      punchLockRef.current = false;
      setPunched(false);
    }, PUNCH_COOLDOWN_MS);
  }

  if (!validShopId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-600 dark:text-red-400">Invalid shop link.</p>
      </div>
    );
  }

  if (pageLoading && !shopName && !loadError) {
    return <ClockScreenSkeleton message="Loading clock page…" />;
  }

  if (loadError && !shopForPunch) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Failed to load clock page</h1>
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
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

  const clockDisabled =
    punched ||
    !gpsVerified ||
    pageLoading ||
    !shopForPunch ||
    (!useManualCode && shopStaff.length === 0);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:py-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Clock</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {shopName || "…"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Page loads first, then we verify your location. Clock In/Out unlocks when verified.
        </p>
      </header>

      {showGpsCard ? (
        <LocationStatusCard />
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
          <p className="font-semibold">Loading shop…</p>
          <p className="mt-1 text-xs opacity-90">GPS verification starts after the page is ready.</p>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            disabled={punched}
            className={`flex-1 rounded-lg border px-3 py-2 font-medium disabled:opacity-50 ${
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
            disabled={punched}
            className={`flex-1 rounded-lg border px-3 py-2 font-medium disabled:opacity-50 ${
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
              disabled={punched || shopStaff.length === 0}
            >
              {shopStaff.length === 0 ? (
                <option value="">{pageLoading ? "Loading staff…" : "No staff assigned"}</option>
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
              disabled={punched}
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={clockDisabled}
          onClick={() => void punch("clock_in")}
          className="rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-sm transition-opacity disabled:opacity-50"
        >
          {punched ? "Saving…" : gpsVerified ? "Clock In" : "Checking location…"}
        </button>
        <button
          type="button"
          disabled={clockDisabled}
          onClick={() => void punch("clock_out")}
          className="rounded-xl bg-zinc-800 py-4 text-lg font-semibold text-white shadow-sm transition-opacity disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
        >
          {punched ? "Saving…" : gpsVerified ? "Clock Out" : "Checking location…"}
        </button>
      </div>

      <Toast message={toast} onDismiss={dismissToast} />
      {loadError ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {loadError}
        </p>
      ) : null}
      {punchError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {punchError}
        </p>
      ) : null}
    </div>
  );
}

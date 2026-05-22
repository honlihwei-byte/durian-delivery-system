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
import { readIndoorGpsSession } from "@/lib/gps-indoor-session";
import { getPunchDeviceId } from "@/lib/gps-indoor-trusted-device";
import type { ShopForPunch, ShopGpsLocation, ShopGpsLocationType } from "@/lib/gps-shop-verify";
import {
  clearRememberedStaff,
  readRememberedStaff,
  saveRememberedStaff,
  staffOptionToRemembered,
  type RememberedStaff,
} from "@/lib/remembered-staff";
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

function parseGpsLocationsFromApi(
  raw: unknown,
  shop: Record<string, unknown> | undefined,
  shopId: string,
): ShopGpsLocation[] {
  const types = new Set<ShopGpsLocationType>(["main", "office", "parking", "loading", "backup"]);
  const fromApi: ShopGpsLocation[] = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const lat = typeof r.latitude === "number" ? r.latitude : null;
      const lng = typeof r.longitude === "number" ? r.longitude : null;
      const type = String(r.location_type ?? "main");
      if (lat == null || lng == null || !types.has(type as ShopGpsLocationType)) continue;
      fromApi.push({
        id: String(r.id ?? ""),
        name: String(r.name ?? "Location"),
        latitude: lat,
        longitude: lng,
        allowed_radius_meters:
          typeof r.allowed_radius_meters === "number" ? r.allowed_radius_meters : 50,
        location_type: type as ShopGpsLocationType,
      });
    }
  }
  if (fromApi.length > 0) return fromApi;

  const lat = typeof shop?.latitude === "number" ? shop.latitude : null;
  const lng = typeof shop?.longitude === "number" ? shop.longitude : null;
  if (lat == null || lng == null) return [];

  return [
    {
      id: `legacy-${shopId}`,
      name: "Main Entrance",
      latitude: lat,
      longitude: lng,
      allowed_radius_meters:
        typeof shop?.allowed_radius_meters === "number" ? shop.allowed_radius_meters : 50,
      location_type: "main",
    },
  ];
}

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

function findStaffInList(
  list: ClockStaffOption[],
  remembered: RememberedStaff,
): ClockStaffOption | undefined {
  return list.find((s) => s.id === remembered.staff_id);
}

function findStaffByCode(list: ClockStaffOption[], code: string): ClockStaffOption | undefined {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  return list.find((s) => s.staff_code.trim().toUpperCase() === normalized);
}

function applyRememberedToList(
  list: ClockStaffOption[],
  remembered: RememberedStaff | null,
): { staffId: string; usingRemembered: boolean; activeRemembered: RememberedStaff | null } {
  if (!remembered || list.length === 0) {
    return { staffId: list[0]?.id ?? "", usingRemembered: false, activeRemembered: null };
  }
  const match = findStaffInList(list, remembered);
  if (match) {
    return { staffId: match.id, usingRemembered: true, activeRemembered: remembered };
  }
  clearRememberedStaff();
  return { staffId: list[0]?.id ?? "", usingRemembered: false, activeRemembered: null };
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

export function ClockScreen({
  shopId,
  punchQrToken,
}: {
  shopId: string;
  punchQrToken: string | null;
}) {
  const validShopId = isValidShopId(shopId);

  const [shopName, setShopName] = useState("");
  const [shopForPunch, setShopForPunch] = useState<ShopForPunch | null>(null);
  const [shopStaff, setShopStaff] = useState<ClockStaffOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [useManualCode, setUseManualCode] = useState(false);
  const [usingRememberedStaff, setUsingRememberedStaff] = useState(false);
  const [staffPickerExpanded, setStaffPickerExpanded] = useState(true);
  const [rememberedStaff, setRememberedStaff] = useState<RememberedStaff | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showGpsCard, setShowGpsCard] = useState(false);
  const [punched, setPunched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [qrTokenError, setQrTokenError] = useState<string | null>(null);

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

    if (!punchQrToken) {
      setQrTokenError(
        "This link is missing the shop QR security code. Scan the official clock QR from your manager.",
      );
    } else {
      setQrTokenError(null);
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

      const rawLocations = (shopJson as { gps_locations?: unknown }).gps_locations;
      const locations = parseGpsLocationsFromApi(rawLocations, shop, shopId);

      if (locations.length > 0) {
        const gpsIndoorMode = shop?.gps_indoor_mode === true;
        setShopForPunch({ id: shopId, name, locations, gpsIndoorMode });
      } else {
        setShopForPunch(null);
        setLoadError("This shop has no GPS locations configured. Contact your manager.");
      }

      if (staffRes.ok) {
        const staffJson = (await staffRes.json()) as { staff?: ClockStaffOption[] };
        const list = Array.isArray(staffJson.staff) ? staffJson.staff : [];
        setShopStaff(list);
        writeStaffCache(shopId, list);
        const { staffId, usingRemembered, activeRemembered } = applyRememberedToList(
          list,
          readRememberedStaff(),
        );
        setRememberedStaff(activeRemembered);
        setSelectedStaffId(staffId);
        setUsingRememberedStaff(usingRemembered);
        setStaffPickerExpanded(!usingRemembered);
      } else {
        const cached = readStaffCache(shopId);
        setShopStaff(cached);
        const { staffId, usingRemembered, activeRemembered } = applyRememberedToList(
          cached,
          readRememberedStaff(),
        );
        setRememberedStaff(activeRemembered);
        setSelectedStaffId(staffId);
        setUsingRememberedStaff(usingRemembered);
        setStaffPickerExpanded(!usingRemembered);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load clock page");
      setShopForPunch(null);
    } finally {
      setPageLoading(false);
    }
  }, [shopId, validShopId, punchQrToken]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const cached = readStaffCache(shopId);
    if (cached.length) {
      setShopStaff(cached);
      const { staffId, usingRemembered, activeRemembered } = applyRememberedToList(
        cached,
        readRememberedStaff(),
      );
      setRememberedStaff(activeRemembered);
      setSelectedStaffId(staffId);
      setUsingRememberedStaff(usingRemembered);
      setStaffPickerExpanded(!usingRemembered);
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

  const persistStaffSelection = useCallback((staff: ClockStaffOption) => {
    const remembered = staffOptionToRemembered(staff);
    saveRememberedStaff(remembered);
    setRememberedStaff(remembered);
    setSelectedStaffId(staff.id);
    setUsingRememberedStaff(true);
    setStaffPickerExpanded(false);
    setUseManualCode(false);
  }, []);

  const handleStaffSelectChange = useCallback(
    (staffId: string) => {
      setSelectedStaffId(staffId);
      const staff = shopStaff.find((s) => s.id === staffId);
      if (staff) persistStaffSelection(staff);
    },
    [shopStaff, persistStaffSelection],
  );

  const handleManualCodeBlur = useCallback(() => {
    const match = findStaffByCode(shopStaff, identifier);
    if (match) persistStaffSelection(match);
  }, [shopStaff, identifier, persistStaffSelection]);

  const handleChangeStaff = useCallback(() => {
    setStaffPickerExpanded(true);
    setUsingRememberedStaff(false);
  }, []);

  const handleForgetStaff = useCallback(() => {
    clearRememberedStaff();
    setRememberedStaff(null);
    setUsingRememberedStaff(false);
    setStaffPickerExpanded(true);
    setSelectedStaffId("");
    setIdentifier("");
    setUseManualCode(false);
  }, []);

  async function postFastAttendance(
    verified: ReturnType<typeof getVerifiedGpsForPunch>,
    action_type: "clock_in" | "clock_out",
    staffId: string,
    manual: string,
  ) {
    const session = readIndoorGpsSession(shopId);
    const body: Record<string, unknown> = {
      shop_id: shopId,
      action_type,
      fast_punch: true,
      gps_verified: true,
      punch_qr_token: punchQrToken,
      staff_latitude: verified.latitude,
      staff_longitude: verified.longitude,
      distance_from_shop_meters: verified.distanceMeters,
      gps_accuracy_meters: Math.round(verified.accuracyMeters * 100) / 100,
      gps_verify_tier: verified.verifyTier,
      ...(shopForPunch?.gpsIndoorMode
        ? {
            location_confidence_score: verified.locationConfidenceScore,
            gps_sample_count: verified.sampleCount,
            gps_sample_spread_meters: Math.round(verified.sampleSpreadMeters * 100) / 100,
            gps_indoor_session_used: verified.indoorSessionUsed,
            gps_indoor_fallback_used: verified.indoorFallbackUsed,
            gps_original_radius_meters: verified.gpsOriginalRadiusM,
            gps_expanded_radius_meters: verified.gpsExpandedRadiusM,
            gps_trusted_window_used: verified.gpsTrustedWindowUsed,
            punch_device_id: getPunchDeviceId(),
          }
        : {}),
      matched_gps_location_name: verified.matchedLocationName,
      matched_gps_location_type: verified.matchedLocationType,
      ...(verified.matchedLocationId.startsWith("legacy-")
        ? {}
        : { matched_gps_location_id: verified.matchedLocationId }),
      ...(session
        ? {
            location_session_at: new Date(session.savedAt).toISOString(),
            location_session_latitude: session.latitude,
            location_session_longitude: session.longitude,
          }
        : {}),
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
      if (useManualCode) {
        const byCode = findStaffByCode(shopStaff, manual);
        if (byCode) persistStaffSelection(byCode);
      } else {
        const byId = shopStaff.find((s) => s.id === staffId);
        if (byId) persistStaffSelection(byId);
      }
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

  const hasStaffForPunch =
    useManualCode ? identifier.trim().length > 0 : Boolean(selectedStaffId) && shopStaff.length > 0;

  const clockDisabled =
    punched ||
    !gpsVerified ||
    pageLoading ||
    !shopForPunch ||
    !hasStaffForPunch ||
    !punchQrToken ||
    Boolean(qrTokenError);

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

      {qrTokenError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {qrTokenError}
        </p>
      ) : null}

      {showGpsCard ? (
        <LocationStatusCard />
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
          <p className="font-semibold">Loading shop…</p>
          <p className="mt-1 text-xs opacity-90">GPS verification starts after the page is ready.</p>
        </section>
      )}

      {usingRememberedStaff && rememberedStaff && !staffPickerExpanded ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="font-semibold">Using remembered staff: {rememberedStaff.staff_name}</p>
          <p className="mt-1 text-xs opacity-90">
            {rememberedStaff.staff_code} · Tap Change staff to pick someone else
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={punched}
              onClick={handleChangeStaff}
              className="flex-1 rounded-lg border border-current/30 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white dark:bg-black/20 dark:hover:bg-black/30 disabled:opacity-50"
            >
              Change staff
            </button>
            <button
              type="button"
              disabled={punched}
              onClick={handleForgetStaff}
              className="flex-1 rounded-lg border border-current/30 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white dark:bg-black/20 dark:hover:bg-black/30 disabled:opacity-50"
            >
              Forget this staff
            </button>
          </div>
        </section>
      ) : null}

      <div className={`flex flex-col gap-3 ${usingRememberedStaff && !staffPickerExpanded ? "hidden" : ""}`}>
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
              onChange={(e) => handleStaffSelectChange(e.target.value)}
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
              onBlur={handleManualCodeBlur}
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
          {punched ? "Saving…" : !punchQrToken ? "Scan shop QR" : gpsVerified ? "Clock In" : "Waiting for location…"}
        </button>
        <button
          type="button"
          disabled={clockDisabled}
          onClick={() => void punch("clock_out")}
          className="rounded-xl bg-zinc-800 py-4 text-lg font-semibold text-white shadow-sm transition-opacity disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
        >
          {punched ? "Saving…" : !punchQrToken ? "Scan shop QR" : gpsVerified ? "Clock Out" : "Waiting for location…"}
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

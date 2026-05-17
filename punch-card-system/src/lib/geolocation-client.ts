import { punchMark, punchTime, punchTimeStart } from "@/lib/punch-timing";

export type StaffPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

export type CachedGpsPosition = StaffPosition & {
  cachedAt: number;
};

export type GpsAccuracyTier = "good" | "fair" | "weak" | "unknown";

export type LocationPrepareStatus = "preparing" | "ready" | "stale" | "error";

/** Prepared GPS valid for punch (30s). */
export const GPS_CACHE_TTL_MS = 30_000;
/** Background refresh interval while page is open. */
export const GPS_REFRESH_INTERVAL_MS = 20_000;

export const GPS_GOOD_ACCURACY_M = 40;
export const GPS_FAIR_ACCURACY_M = 80;
export const GPS_WEAK_ACCURACY_METERS = 100;

export const GPS_WEAK_HINT =
  "GPS weak — move near entrance or turn on Wi-Fi/location. You can still punch; we use your accuracy buffer.";

const STORAGE_KEY = "punch-card-gps-cache-v2";

/** First quick fix when opening clock page. */
const QUICK_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 3000,
  maximumAge: 30000,
};

/** Background better fix (does not block punch). */
const REFINE_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 10000,
};

let memoryCache: CachedGpsPosition | null = null;
let prepareStatus: LocationPrepareStatus = "preparing";
let prepareError: string | null = null;
let prepareCycleInFlight: Promise<void> | null = null;
let refreshTimer: number | null = null;
let staleCheckTimer: number | null = null;
let stateListeners = new Set<() => void>();

function notifyState() {
  for (const fn of stateListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeGpsCache(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export function getLocationPrepareSnapshot(): {
  status: LocationPrepareStatus;
  error: string | null;
  cached: CachedGpsPosition | null;
} {
  const cached = readCacheRaw();
  let status = prepareStatus;
  if (cached && isCacheFresh(cached)) {
    status = prepareStatus === "error" ? "error" : "ready";
  } else if (prepareStatus === "ready") {
    status = "stale";
  }
  return { status, error: prepareError, cached: isCacheFresh(cached) ? cached : null };
}

function geolocationError(err: GeolocationPositionError): Error {
  if (err.code === err.PERMISSION_DENIED) {
    return new Error("Location permission denied. Please allow location access to clock in/out.");
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return new Error("Could not determine your location. Try again outdoors or enable GPS.");
  }
  if (err.code === err.TIMEOUT) {
    return new Error("Location request timed out. Please wait or move near a window.");
  }
  return new Error("Could not get your location. Please try again.");
}

function readPosition(options: PositionOptions, label: string): Promise<StaffPosition> {
  punchMark(`GPS start: ${label}`);
  const t0 = punchTimeStart();
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot get your location. Use a phone with GPS enabled."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        const position: StaffPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Number.isFinite(accuracy) ? accuracy : 9999,
        };
        punchTime(`GPS end: ${label}`, t0, `±${Math.round(position.accuracyMeters)}m`);
        resolve(position);
      },
      (err) => {
        punchTime(`GPS failed: ${label}`, t0, err.message);
        reject(geolocationError(err));
      },
      options,
    );
  });
}

function isCacheFresh(cached: CachedGpsPosition | null): cached is CachedGpsPosition {
  if (!cached) return false;
  return Date.now() - cached.cachedAt <= GPS_CACHE_TTL_MS;
}

function writeCache(position: StaffPosition): CachedGpsPosition {
  const entry: CachedGpsPosition = { ...position, cachedAt: Date.now() };
  memoryCache = entry;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    }
  } catch {
    /* ignore */
  }
  notifyState();
  return entry;
}

function readCacheRaw(): CachedGpsPosition | null {
  const now = Date.now();
  if (memoryCache) {
    return memoryCache;
  }
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGpsPosition;
    if (
      !parsed ||
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function getCachedGpsPosition(): CachedGpsPosition | null {
  const c = readCacheRaw();
  return isCacheFresh(c) ? c : null;
}

export function getGpsCacheAgeMs(): number | null {
  const c = readCacheRaw();
  if (!c) return null;
  return Date.now() - c.cachedAt;
}

export function gpsAccuracyTier(accuracyMeters: number | null | undefined): GpsAccuracyTier {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return "unknown";
  if (accuracyMeters <= GPS_GOOD_ACCURACY_M) return "good";
  if (accuracyMeters <= GPS_FAIR_ACCURACY_M) return "fair";
  return "weak";
}

export function gpsAccuracyTierLabel(tier: GpsAccuracyTier): string {
  switch (tier) {
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "weak":
      return "Weak";
    default:
      return "—";
  }
}

export function isGpsAccuracyWeak(accuracyMeters: number): boolean {
  return accuracyMeters > GPS_WEAK_ACCURACY_METERS;
}

/** True when staff can punch (fresh prepared GPS). */
export function isLocationReadyForPunch(): boolean {
  const { status } = getLocationPrepareSnapshot();
  return status === "ready";
}

/**
 * Use only at punch — must not call geolocation.
 * @throws if location not prepared or cache expired
 */
export function getPreparedGpsForPunch(): CachedGpsPosition {
  const cached = getCachedGpsPosition();
  if (!cached) {
    throw new Error("Location is not ready. Please wait until preparation finishes.");
  }
  punchMark("punch uses prepared GPS (no new request)");
  return cached;
}

async function runPrepareCycle(): Promise<void> {
  const quick = await readPosition(QUICK_GEO_OPTIONS, "prepare-quick");
  writeCache(quick);
  prepareStatus = "ready";
  prepareError = null;
  notifyState();

  void readPosition(REFINE_GEO_OPTIONS, "prepare-refine")
    .then((refined) => {
      const current = readCacheRaw();
      if (!current || refined.accuracyMeters < current.accuracyMeters) {
        writeCache(refined);
        prepareStatus = "ready";
        notifyState();
      }
    })
    .catch(() => {
      /* keep quick fix */
    });
}

async function runPrepareCycleSafe(): Promise<void> {
  if (prepareCycleInFlight) return prepareCycleInFlight;

  const wasStale = prepareStatus === "stale";
  if (!wasStale && prepareStatus !== "error") {
    prepareStatus = "preparing";
    notifyState();
  }

  prepareCycleInFlight = (async () => {
    try {
      await runPrepareCycle();
    } catch (e) {
      prepareStatus = "error";
      prepareError = e instanceof Error ? e.message : "Could not prepare location";
      notifyState();
    } finally {
      prepareCycleInFlight = null;
    }
  })();

  return prepareCycleInFlight;
}

function updateStaleStatus() {
  const cached = readCacheRaw();
  if (!cached) return;
  if (!isCacheFresh(cached) && prepareStatus === "ready" && !prepareCycleInFlight) {
    prepareStatus = "stale";
    notifyState();
    void runPrepareCycleSafe();
  }
}

/**
 * Call once when clock page mounts. Requests GPS immediately + refresh every 20s.
 * @returns cleanup (clear intervals)
 */
export function startPreparedLocationService(): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    prepareStatus = "error";
    prepareError = "This browser cannot get your location.";
    notifyState();
    return () => {};
  }

  const existing = readCacheRaw();
  if (existing && isCacheFresh(existing)) {
    prepareStatus = "ready";
    memoryCache = existing;
    notifyState();
    void runPrepareCycleSafe();
  } else {
    prepareStatus = "preparing";
    prepareError = null;
    notifyState();
    void runPrepareCycleSafe();
  }

  refreshTimer = window.setInterval(() => {
    void runPrepareCycleSafe();
  }, GPS_REFRESH_INTERVAL_MS);

  staleCheckTimer = window.setInterval(updateStaleStatus, 1000);

  return () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
    if (staleCheckTimer) window.clearInterval(staleCheckTimer);
    refreshTimer = null;
    staleCheckTimer = null;
  };
}

/** Admin shop picker — single refined read. */
export async function getStaffPosition(): Promise<Pick<StaffPosition, "latitude" | "longitude">> {
  const pos = await readPosition(REFINE_GEO_OPTIONS, "admin");
  writeCache(pos);
  return { latitude: pos.latitude, longitude: pos.longitude };
}

/** @deprecated use startPreparedLocationService */
export function prefetchStaffPosition(): void {
  startPreparedLocationService();
}

import { aggregateGpsSamples, type AggregatedGpsPosition } from "@/lib/gps-aggregate";
import { punchMark, punchTime, punchTimeStart } from "@/lib/punch-timing";

export type StaffPosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

export type CachedGpsPosition = StaffPosition & {
  cachedAt: number;
  sampleCount?: number;
  sampleSpreadMeters?: number;
};

export type { AggregatedGpsPosition };

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
  "GPS weak indoors — Wi-Fi helps. You can still punch; this punch is logged as Weak Indoor.";

export const GPS_WEAK_INDOOR_HINT =
  "Indoor GPS verified with reduced precision. Punch is allowed and flagged for audit.";

export const GPS_UNSTABLE_HINT =
  "GPS readings are shifting. Stay still and tap Refresh Location, or punch if already verified.";

const GPS_SAMPLE_BUFFER_MAX = 5;
const GPS_FULL_REFRESH_SAMPLES = 3;
const GPS_SAMPLE_DELAY_MS = 2000;

export const GPS_INDOOR_HINT =
  "Getting location may take longer indoors. Please turn on Wi-Fi and Location.";

export const GPS_UNAVAILABLE_MSG = "Location unavailable";

const STORAGE_KEY = "punch-card-gps-cache-v2";

/** Stage 1: fast approximate fix. */
const STAGE1_FAST_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 30000,
};

/** Stage 2: better accuracy (background; failure does not clear stage 1). */
const STAGE2_REFINE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
};

let memoryCache: CachedGpsPosition | null = null;
let sampleBuffer: StaffPosition[] = [];
let prepareStatus: LocationPrepareStatus = "preparing";
let prepareError: string | null = null;
let prepareCycleInFlight: Promise<void> | null = null;
let refreshTimer: number | null = null;
let staleCheckTimer: number | null = null;
let stateListeners = new Set<() => void>();
/** Bumped on manual refresh — stale async GPS work must not write cache or status. */
let prepareGeneration = 0;

function notifyState() {
  for (const fn of stateListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function bumpPrepareGeneration(): number {
  prepareGeneration += 1;
  return prepareGeneration;
}

function isActiveGeneration(gen: number): boolean {
  return gen === prepareGeneration;
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
  return new Error(GPS_UNAVAILABLE_MSG);
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

function pushGpsSample(position: StaffPosition): void {
  sampleBuffer.push(position);
  if (sampleBuffer.length > GPS_SAMPLE_BUFFER_MAX) {
    sampleBuffer = sampleBuffer.slice(-GPS_SAMPLE_BUFFER_MAX);
  }
}

function clearGpsSampleBuffer(): void {
  sampleBuffer = [];
}

function aggregatedFromBuffer(): AggregatedGpsPosition | null {
  return aggregateGpsSamples(sampleBuffer);
}

function writeCache(position: StaffPosition, gen: number): CachedGpsPosition | null {
  if (!isActiveGeneration(gen)) return null;
  pushGpsSample(position);
  const aggregated = aggregatedFromBuffer();
  const entry: CachedGpsPosition = aggregated
    ? {
        latitude: aggregated.latitude,
        longitude: aggregated.longitude,
        accuracyMeters: aggregated.accuracyMeters,
        sampleCount: aggregated.sampleCount,
        sampleSpreadMeters: aggregated.sampleSpreadMeters,
        cachedAt: Date.now(),
      }
    : {
        ...position,
        sampleCount: 1,
        sampleSpreadMeters: 0,
        cachedAt: Date.now(),
      };
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

export function getGpsSampleMeta(): { sampleCount: number; sampleSpreadMeters: number } {
  const cached = getCachedGpsPosition();
  if (cached?.sampleCount != null) {
    return {
      sampleCount: cached.sampleCount,
      sampleSpreadMeters: cached.sampleSpreadMeters ?? 0,
    };
  }
  const aggregated = aggregatedFromBuffer();
  return {
    sampleCount: aggregated?.sampleCount ?? sampleBuffer.length,
    sampleSpreadMeters: aggregated?.sampleSpreadMeters ?? 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function collectGpsSamples(
  gen: number,
  count: number,
): Promise<StaffPosition[]> {
  const samples: StaffPosition[] = [];
  for (let i = 0; i < count; i++) {
    if (!isActiveGeneration(gen)) break;
    const opts = i === count - 1 ? STAGE2_REFINE_OPTIONS : STAGE1_FAST_OPTIONS;
    const label = count > 1 ? `sample-${i + 1}-of-${count}` : "single";
    try {
      samples.push(await readPosition(opts, label));
    } catch (e) {
      if (samples.length === 0) throw e;
      break;
    }
    if (i < count - 1 && isActiveGeneration(gen)) {
      await sleep(GPS_SAMPLE_DELAY_MS);
    }
  }
  return samples;
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

type PrepareCycleOptions = { fullSample?: boolean };

/** Multi-sample prepare: median position in cache; optional 3-sample refresh. */
async function runPrepareCycle(gen: number, opts?: PrepareCycleOptions): Promise<void> {
  if (opts?.fullSample) {
    clearGpsSampleBuffer();
    const samples = await collectGpsSamples(gen, GPS_FULL_REFRESH_SAMPLES);
    if (!isActiveGeneration(gen) || samples.length === 0) return;
    for (const sample of samples) {
      writeCache(sample, gen);
    }
    prepareStatus = "ready";
    prepareError = null;
    notifyState();
    return;
  }

  let position: StaffPosition | null = null;

  try {
    position = await readPosition(STAGE1_FAST_OPTIONS, "stage1-fast");
  } catch (stage1Err) {
    if (!isActiveGeneration(gen)) return;
    punchMark("stage1-fast failed, trying stage2-fallback");
    try {
      position = await readPosition(STAGE2_REFINE_OPTIONS, "stage2-fallback");
    } catch {
      if (!isActiveGeneration(gen)) return;
      throw stage1Err;
    }
  }

  if (!isActiveGeneration(gen)) return;

  writeCache(position, gen);
  prepareStatus = "ready";
  prepareError = null;
  notifyState();

  void readPosition(STAGE2_REFINE_OPTIONS, "stage2-refine")
    .then((refined) => {
      if (!isActiveGeneration(gen)) return;
      writeCache(refined, gen);
      if (isActiveGeneration(gen)) {
        prepareStatus = "ready";
        prepareError = null;
        notifyState();
      }
    })
    .catch(() => {
      /* Stage 2 timeout is OK — keep aggregated fix */
    });
}

async function runPrepareCycleSafe(): Promise<void> {
  if (prepareCycleInFlight) return prepareCycleInFlight;

  const gen = prepareGeneration;
  const wasStale = prepareStatus === "stale";
  if (!wasStale && prepareStatus !== "error") {
    prepareStatus = "preparing";
    prepareError = null;
    notifyState();
  }

  prepareCycleInFlight = (async () => {
    try {
      await runPrepareCycle(gen, { fullSample: false });
      if (!isActiveGeneration(gen)) return;
      prepareStatus = "ready";
      prepareError = null;
      notifyState();
    } catch (e) {
      if (!isActiveGeneration(gen)) return;
      const err = e instanceof Error ? e : new Error(GPS_UNAVAILABLE_MSG);
      prepareError = err.message.includes("permission") ? err.message : GPS_UNAVAILABLE_MSG;
      prepareStatus = "error";
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
  const gen = bumpPrepareGeneration();
  const pos = await readPosition(STAGE2_REFINE_OPTIONS, "admin");
  writeCache(pos, gen);
  return { latitude: pos.latitude, longitude: pos.longitude };
}

function clearCacheStorage(): void {
  memoryCache = null;
  clearGpsSampleBuffer();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Clear cached fix (does not bump generation). */
export function clearGpsCache(): void {
  clearCacheStorage();
  prepareStatus = "preparing";
  prepareError = null;
  notifyState();
}

/**
 * Manual refresh — same prepare cycle as first load, invalidates in-flight GPS work.
 */
export async function forceRefreshGpsPosition(): Promise<void> {
  const gen = bumpPrepareGeneration();
  console.log("[gps] prepare cycle start (refresh)", { generation: gen });

  clearCacheStorage();
  prepareStatus = "preparing";
  prepareError = null;
  notifyState();

  try {
    await runPrepareCycle(gen, { fullSample: true });
    if (!isActiveGeneration(gen)) {
      console.log("[gps] prepare cycle ignored (stale generation)", { generation: gen });
      return;
    }
    prepareStatus = "ready";
    prepareError = null;
    notifyState();
    const cached = getCachedGpsPosition();
    const meta = getGpsSampleMeta();
    console.log("[gps] prepare cycle ready", {
      generation: gen,
      accuracy: cached?.accuracyMeters,
      samples: meta.sampleCount,
      spread: meta.sampleSpreadMeters,
    });
  } catch (e) {
    if (!isActiveGeneration(gen)) return;
    const err = e instanceof Error ? e : new Error(GPS_UNAVAILABLE_MSG);
    prepareError = err.message.includes("permission") ? err.message : GPS_UNAVAILABLE_MSG;
    prepareStatus = "error";
    notifyState();
    console.log("[gps] prepare cycle failed", { generation: gen, error: prepareError });
    throw err;
  }
}

/** @deprecated use startPreparedLocationService */
export function prefetchStaffPosition(): void {
  startPreparedLocationService();
}

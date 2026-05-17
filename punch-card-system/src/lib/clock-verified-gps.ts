import {
  checkGpsAgainstShop,
  TOO_FAR_MSG,
  type ShopForPunch,
} from "@/lib/gps-shop-verify";
import {
  getCachedGpsPosition,
  getLocationPrepareSnapshot,
  startPreparedLocationService,
  subscribeGpsCache,
  type CachedGpsPosition,
} from "@/lib/geolocation-client";

export type VerifiedGps = CachedGpsPosition & {
  distanceMeters: number;
  gpsVerified: true;
};

export type ClockGpsVerifyPhase = "checking" | "verified" | "too_far" | "error";

export type ClockGpsVerifySnapshot = {
  phase: ClockGpsVerifyPhase;
  error: string | null;
  tooFarMessage: string | null;
  verified: VerifiedGps | null;
  distanceMeters: number | null;
  accuracyMeters: number | null;
};

const INITIAL_SNAPSHOT: ClockGpsVerifySnapshot = {
  phase: "checking",
  error: null,
  tooFarMessage: null,
  verified: null,
  distanceMeters: null,
  accuracyMeters: null,
};

let activeShop: ShopForPunch | null = null;
let verified: VerifiedGps | null = null;
let phase: ClockGpsVerifyPhase = "checking";
let verifyError: string | null = null;
let tooFarMessage: string | null = null;
let distanceMeters: number | null = null;
let accuracyMeters: number | null = null;
let stopGpsService: (() => void) | null = null;
let pollId: number | null = null;
let verifyListeners = new Set<() => void>();

function notifyVerify() {
  for (const fn of verifyListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function recomputeVerification() {
  if (!activeShop) return;

  try {
    const prepare = getLocationPrepareSnapshot();
    if (prepare.error) {
      phase = "error";
      verifyError = prepare.error;
      tooFarMessage = null;
      verified = null;
      distanceMeters = null;
      accuracyMeters = null;
      notifyVerify();
      return;
    }

    const cached = getCachedGpsPosition();
    if (!cached) {
      phase = prepare.status === "error" ? "error" : "checking";
      verifyError = prepare.status === "error" ? prepare.error : null;
      tooFarMessage = null;
      verified = null;
      distanceMeters = null;
      accuracyMeters = null;
      notifyVerify();
      return;
    }

    accuracyMeters = cached.accuracyMeters;
    const check = checkGpsAgainstShop(
      activeShop,
      cached.latitude,
      cached.longitude,
      cached.accuracyMeters,
    );
    distanceMeters = check.distanceM;

    if (check.gpsVerified) {
      phase = "verified";
      verifyError = null;
      tooFarMessage = null;
      verified = {
        ...cached,
        distanceMeters: Math.round(check.distanceM * 100) / 100,
        gpsVerified: true,
      };
    } else {
      phase = "too_far";
      verifyError = null;
      tooFarMessage = TOO_FAR_MSG;
      verified = null;
    }
    notifyVerify();
  } catch (e) {
    phase = "error";
    verifyError = e instanceof Error ? e.message : "Could not verify location";
    verified = null;
    notifyVerify();
  }
}

export function subscribeClockGpsVerify(listener: () => void): () => void {
  verifyListeners.add(listener);
  return () => verifyListeners.delete(listener);
}

export function getClockGpsVerifySnapshot(): ClockGpsVerifySnapshot {
  return {
    phase,
    error: verifyError,
    tooFarMessage,
    verified,
    distanceMeters,
    accuracyMeters,
  };
}

export function getClockGpsVerifyServerSnapshot(): ClockGpsVerifySnapshot {
  return INITIAL_SNAPSHOT;
}

export function isGpsVerifiedForPunch(): boolean {
  return phase === "verified" && verified != null;
}

/** Use at punch only — no geolocation call. */
export function getVerifiedGpsForPunch(): VerifiedGps {
  if (!verified || phase !== "verified") {
    throw new Error("Location is not verified. Wait until you are within shop range.");
  }
  return verified;
}

/**
 * Start GPS acquisition + distance verification for a shop.
 * Buttons may enable only when phase === "verified".
 */
export function startClockGpsVerification(shop: ShopForPunch): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  activeShop = shop;
  phase = "checking";
  verifyError = null;
  tooFarMessage = null;
  verified = null;
  notifyVerify();

  if (stopGpsService) stopGpsService();
  stopGpsService = startPreparedLocationService();

  const unsubGps = subscribeGpsCache(recomputeVerification);
  recomputeVerification();

  pollId = window.setInterval(recomputeVerification, 400);

  return () => {
    if (pollId != null) window.clearInterval(pollId);
    pollId = null;
    unsubGps();
    if (stopGpsService) {
      stopGpsService();
      stopGpsService = null;
    }
    activeShop = null;
    verified = null;
    phase = "checking";
    notifyVerify();
  };
}

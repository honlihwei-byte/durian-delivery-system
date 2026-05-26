import { isValidLatitude, isValidLongitude, parseCoord } from "@/lib/geo";
import {
  INDOOR_SESSION_TTL_MS,
  type IndoorGpsSession,
} from "@/lib/gps-indoor-session";
import {
  checkGpsAgainstLocations,
  GPS_WEAK_ACCURACY_THRESHOLD_M,
  TOO_FAR_MSG,
  type GpsCheckResult,
  type GpsLocationMatchResult,
  type GpsVerifyContext,
  type GpsVerifyTier,
  type ShopForPunch,
  type ShopGpsLocation,
} from "@/lib/gps-shop-verify";
import { listShopGpsLocations, type ShopGpsLocationRow } from "@/lib/shop-gps-locations";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { punchQrTokensMatch, verifySignedPunchQrPayload } from "@/lib/punch-qr-token";
import type { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAssignedToShop, resolveStaffForPunch, type StaffCore } from "@/lib/staff";

type Supabase = ReturnType<typeof createAdminClient>;

export type {
  GpsCheckResult,
  GpsLocationMatchResult,
  GpsVerifyContext,
  GpsVerifyTier,
  ShopForPunch,
  ShopGpsLocation,
};
export { checkGpsAgainstLocations, GPS_WEAK_ACCURACY_THRESHOLD_M, TOO_FAR_MSG };

export type PunchGpsBodyExtras = {
  gps_sample_count?: number | null;
  gps_sample_spread_meters?: number | null;
  gps_indoor_session_used?: boolean;
  gps_trusted_window_used?: boolean;
  punch_device_id?: string | null;
  punch_browser_info?: string | null;
  random_selfie_path?: string | null;
  selfie_challenge_token?: string | null;
  location_session_at?: string | null;
  location_session_latitude?: number | null;
  location_session_longitude?: number | null;
};

export function parsePunchGpsExtras(body: Record<string, unknown>): PunchGpsBodyExtras {
  const sampleCountRaw = body.gps_sample_count;
  const sampleCount =
    typeof sampleCountRaw === "number" && Number.isFinite(sampleCountRaw) && sampleCountRaw > 0
      ? Math.round(sampleCountRaw)
      : null;

  const spreadRaw = parseCoord(body.gps_sample_spread_meters);
  const sampleSpread =
    spreadRaw !== null && Number.isFinite(spreadRaw) && spreadRaw >= 0
      ? Math.round(spreadRaw * 100) / 100
      : null;

  const sessionLat = parseCoord(body.location_session_latitude);
  const sessionLng = parseCoord(body.location_session_longitude);
  const sessionAt =
    typeof body.location_session_at === "string" && body.location_session_at.trim()
      ? body.location_session_at.trim()
      : null;

  const punchDeviceId =
    typeof body.punch_device_id === "string" && body.punch_device_id.trim()
      ? body.punch_device_id.trim().slice(0, 128)
      : null;

  const punchBrowserInfo =
    typeof body.punch_browser_info === "string" && body.punch_browser_info.trim()
      ? body.punch_browser_info.trim().slice(0, 500)
      : null;

  const randomSelfiePath =
    typeof body.random_selfie_path === "string" && body.random_selfie_path.trim()
      ? body.random_selfie_path.trim().slice(0, 512)
      : null;

  const selfieChallengeToken =
    typeof body.selfie_challenge_token === "string" && body.selfie_challenge_token.trim()
      ? body.selfie_challenge_token.trim()
      : null;

  return {
    gps_sample_count: sampleCount,
    gps_sample_spread_meters: sampleSpread,
    gps_indoor_session_used: body.gps_indoor_session_used === true,
    gps_trusted_window_used: body.gps_trusted_window_used === true,
    punch_device_id: punchDeviceId,
    punch_browser_info: punchBrowserInfo,
    random_selfie_path: randomSelfiePath,
    selfie_challenge_token: selfieChallengeToken,
    location_session_at: sessionAt,
    location_session_latitude: sessionLat,
    location_session_longitude: sessionLng,
  };
}

export function buildGpsVerifyContext(
  shop: ShopForPunch,
  extras: PunchGpsBodyExtras,
): GpsVerifyContext {
  let indoorSession: IndoorGpsSession | null = null;
  const lat = extras.location_session_latitude;
  const lng = extras.location_session_longitude;
  const at = extras.location_session_at;
  if (lat != null && lng != null && at) {
    const savedAt = Date.parse(at);
    if (Number.isFinite(savedAt) && Date.now() - savedAt <= INDOOR_SESSION_TTL_MS) {
      indoorSession = {
        shopId: shop.id,
        latitude: lat,
        longitude: lng,
        accuracyMeters: 0,
        verifyTier: "weak_indoor",
        matchedLocationId: null,
        savedAt,
      };
    }
  }

  return {
    sampleCount: extras.gps_sample_count ?? 1,
    sampleSpreadM: extras.gps_sample_spread_meters,
    indoorSession,
    shopIndoorMode: shop.gpsIndoorMode,
  };
}

export function parseStaffGps(body: Record<string, unknown>):
  | { ok: true; lat: number; lng: number; accuracyM: number | null }
  | { ok: false; error: string } {
  const staffLat = parseCoord(body.staff_latitude);
  const staffLng = parseCoord(body.staff_longitude);
  if (staffLat === null || staffLng === null) {
    return {
      ok: false,
      error: "Location is required. Please allow GPS permission and try again.",
    };
  }
  if (!isValidLatitude(staffLat) || !isValidLongitude(staffLng)) {
    return { ok: false, error: "Invalid staff GPS coordinates" };
  }
  const accuracyRaw = parseCoord(body.gps_accuracy_meters);
  const accuracyM =
    accuracyRaw !== null && Number.isFinite(accuracyRaw) && accuracyRaw >= 0 ? accuracyRaw : null;
  return { ok: true, lat: staffLat, lng: staffLng, accuracyM };
}

function rowToLocation(row: ShopGpsLocationRow): ShopGpsLocation {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    allowed_radius_meters: row.allowed_radius_meters,
    location_type: row.location_type,
  };
}

function legacyLocationFromShop(shop: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
}): ShopGpsLocation {
  return {
    id: `legacy-${shop.id}`,
    name: "Main Entrance",
    latitude: shop.latitude,
    longitude: shop.longitude,
    allowed_radius_meters: shop.allowed_radius_meters,
    location_type: "main",
  };
}

export type ShopForPunchWithToken = ShopForPunch & {
  punchQrToken: string | null;
  companyId: string | null;
};

export function validatePunchQrToken(
  shopId: string,
  storedToken: string | null | undefined,
  provided: unknown,
): { ok: true } | { ok: false; error: string } {
  const token = normalizePunchQrToken(provided);
  if (!storedToken?.trim()) {
    return { ok: false, error: "Shop QR is not configured. Ask your manager to regenerate the clock QR." };
  }
  if (!token) {
    return {
      ok: false,
      error: "Missing QR security token. Please scan the latest clock QR code from your manager.",
    };
  }
  const match =
    token.includes(".") && verifySignedPunchQrPayload(shopId, token, storedToken)
      ? true
      : punchQrTokensMatch(storedToken, token);
  if (!match) {
    return {
      ok: false,
      error: "Invalid or expired QR code. Please scan the current clock QR posted at your shop.",
    };
  }
  return { ok: true };
}

export async function loadShopForPunch(
  supabase: Supabase,
  shopId: string,
  _opts?: { includePhotoProofFlag?: boolean },
): Promise<{ shop: ShopForPunchWithToken } | { error: string; status: number }> {
  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select(
      "id, name, latitude, longitude, allowed_radius_meters, gps_indoor_mode, allow_photo_proof_fallback, punch_qr_token, company_id",
    )
    .eq("id", shopId)
    .maybeSingle();

  if (shopErr || !shop) {
    return { error: "Shop not found", status: 404 };
  }

  if (shop.company_id) {
    try {
      const { fetchCompanyById } = await import("@/lib/company-db");
      const {
        clockSubscriptionMessage,
        companyFeatureAccess,
        getSubscriptionForCompany,
      } = await import("@/lib/billing");
      const company = await fetchCompanyById(supabase, String(shop.company_id));
      if (company) {
        const sub = await getSubscriptionForCompany(supabase, company);
        if (companyFeatureAccess(company, sub) !== "full") {
          return { error: clockSubscriptionMessage(), status: 403 };
        }
      }
    } catch {
      /* companies table may not exist yet — allow legacy clock */
    }
  }

  let locations: ShopGpsLocation[] = [];
  try {
    const rows = await listShopGpsLocations(supabase, shopId, true);
    locations = rows.map(rowToLocation);
  } catch {
    /* table may not exist on old DB — fall through to legacy */
  }

  if (locations.length === 0 && shop.latitude != null && shop.longitude != null) {
    locations = [
      legacyLocationFromShop({
        id: shop.id,
        name: shop.name,
        latitude: shop.latitude,
        longitude: shop.longitude,
        allowed_radius_meters: shop.allowed_radius_meters ?? 50,
      }),
    ];
  }

  if (locations.length === 0) {
    return {
      error: "This shop has no GPS locations configured. Contact your manager.",
      status: 400,
    };
  }

  const gpsIndoorMode = shop.gps_indoor_mode === true;
  const allowPhotoProofFallback = shop.allow_photo_proof_fallback === true;

  return {
    shop: {
      id: shop.id,
      name: shop.name,
      locations,
      gpsIndoorMode,
      allowPhotoProofFallback,
      punchQrToken: typeof shop.punch_qr_token === "string" ? shop.punch_qr_token : null,
      companyId: shop.company_id != null ? String(shop.company_id) : null,
    },
  };
}

export async function validateStaffForPunch(
  supabase: Supabase,
  shopId: string,
  opts: { staffId?: string; staffIdentifier?: string },
): Promise<
  | { staff: StaffCore }
  | { error: string; status: number }
> {
  const staffId = opts.staffId?.trim();
  const staffIdentifier = opts.staffIdentifier?.trim();

  if (!staffId && !staffIdentifier) {
    return { error: "Select your name or enter your staff code.", status: 400 };
  }

  if (staffId) {
    const STAFF_PUNCH_SELECT =
      "id, staff_name, staff_code, staff_type, id_card_qr_value, status, allow_punch, created_at, updated_at" as const;

    const [staffRes, assignRes] = await Promise.all([
      supabase.from("staff").select(STAFF_PUNCH_SELECT).eq("id", staffId).maybeSingle(),
      supabase
        .from("staff_shop_assignments")
        .select("id")
        .eq("staff_id", staffId)
        .eq("shop_id", shopId)
        .maybeSingle(),
    ]);

    if (staffRes.error) throw staffRes.error;
    const staffRow = staffRes.data as StaffCore | null;
    if (!staffRow) {
      return { error: "Staff not found for this code or ID card", status: 404 };
    }
    if (staffRow.status !== "active") {
      return { error: "This staff member is inactive", status: 403 };
    }
    if ((staffRow as { allow_punch?: boolean }).allow_punch === false) {
      return { error: "Punch not allowed for this employee. Contact your manager.", status: 403 };
    }
    if (assignRes.error) throw assignRes.error;
    if (!assignRes.data) {
      return {
        error: "You are not assigned to this shop. Clock in/out is not allowed.",
        status: 403,
      };
    }
    return { staff: staffRow };
  }

  const staffRow = await resolveStaffForPunch(supabase, { staffIdentifier });
  if (!staffRow) {
    return { error: "Staff not found for this code or ID card", status: 404 };
  }
  if (staffRow.status !== "active") {
    return { error: "This staff member is inactive", status: 403 };
  }
  if ((staffRow as { allow_punch?: boolean }).allow_punch === false) {
    return { error: "Punch not allowed for this employee. Contact your manager.", status: 403 };
  }

  const assigned = await isStaffAssignedToShop(supabase, staffRow.id, shopId);
  if (!assigned) {
    return {
      error: "You are not assigned to this shop. Clock in/out is not allowed.",
      status: 403,
    };
  }

  return { staff: staffRow };
}

export function attendanceGpsFieldsFromCheck(
  gps: GpsLocationMatchResult,
  accuracyOverride?: number | null,
  options?: { punchDeviceId?: string | null },
): {
  staff_latitude: number;
  staff_longitude: number;
  distance_from_shop_meters: number;
  gps_accuracy_meters: number | null;
  gps_verified: boolean;
  gps_verify_tier: GpsVerifyTier;
  gps_sample_count: number | null;
  gps_sample_spread_meters: number | null;
  gps_indoor_session_used: boolean;
  gps_review_required: boolean;
  location_confidence_score: number | null;
  gps_indoor_fallback_used: boolean;
  gps_original_radius_meters: number | null;
  gps_expanded_radius_meters: number | null;
  gps_trusted_window_used: boolean;
  punch_device_id: string | null;
  matched_gps_location_id?: string | null;
  matched_gps_location_name?: string | null;
  matched_gps_location_type?: string | null;
} {
  const accuracyM =
    accuracyOverride != null
      ? accuracyOverride
      : gps.gpsAccuracyMeters != null
        ? Math.round(gps.gpsAccuracyMeters * 100) / 100
        : null;

  const base = {
    staff_latitude: gps.staffLat,
    staff_longitude: gps.staffLng,
    distance_from_shop_meters: Math.round(gps.distanceM * 100) / 100,
    gps_accuracy_meters: accuracyM,
    gps_verified: gps.allowsPunch,
    gps_verify_tier: gps.verifyTier,
    gps_sample_count: gps.sampleCount > 0 ? gps.sampleCount : null,
    gps_sample_spread_meters:
      gps.sampleSpreadM != null ? Math.round(gps.sampleSpreadM * 100) / 100 : null,
    gps_indoor_session_used: gps.indoorSessionUsed,
    gps_review_required: gps.reviewRequired,
    location_confidence_score:
      gps.locationConfidenceScore > 0 ? gps.locationConfidenceScore : null,
    gps_indoor_fallback_used: gps.indoorFallbackUsed,
    gps_original_radius_meters:
      gps.gpsOriginalRadiusM != null
        ? Math.round(gps.gpsOriginalRadiusM * 100) / 100
        : null,
    gps_expanded_radius_meters:
      gps.gpsExpandedRadiusM != null
        ? Math.round(gps.gpsExpandedRadiusM * 100) / 100
        : null,
    gps_trusted_window_used: gps.gpsTrustedWindowUsed,
    punch_device_id: options?.punchDeviceId ?? null,
  };

  const loc = gps.matchedLocation;
  if (!loc || !gps.allowsPunch) return base;

  const locationId = loc.id.startsWith("legacy-") ? null : loc.id;

  return {
    ...base,
    matched_gps_location_id: locationId,
    matched_gps_location_name: loc.name,
    matched_gps_location_type: loc.location_type,
  };
}

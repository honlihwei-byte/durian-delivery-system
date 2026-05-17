import { isValidLatitude, isValidLongitude, parseCoord } from "@/lib/geo";
import {
  checkGpsAgainstLocations,
  GPS_WEAK_ACCURACY_THRESHOLD_M,
  TOO_FAR_MSG,
  type GpsCheckResult,
  type GpsLocationMatchResult,
  type ShopForPunch,
  type ShopGpsLocation,
} from "@/lib/gps-shop-verify";
import { listShopGpsLocations, type ShopGpsLocationRow } from "@/lib/shop-gps-locations";
import type { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAssignedToShop, resolveStaffForPunch, type StaffCore } from "@/lib/staff";

type Supabase = ReturnType<typeof createAdminClient>;

export type { GpsCheckResult, GpsLocationMatchResult, ShopForPunch, ShopGpsLocation };
export { checkGpsAgainstLocations, GPS_WEAK_ACCURACY_THRESHOLD_M, TOO_FAR_MSG };

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

export async function loadShopForPunch(
  supabase: Supabase,
  shopId: string,
): Promise<{ shop: ShopForPunch } | { error: string; status: number }> {
  const { data: shop, error: shopErr } = await supabase
    .from("shops")
    .select("id, name, latitude, longitude, allowed_radius_meters")
    .eq("id", shopId)
    .maybeSingle();

  if (shopErr || !shop) {
    return { error: "Shop not found", status: 404 };
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

  return {
    shop: {
      id: shop.id,
      name: shop.name,
      locations,
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
      "id, staff_name, staff_code, staff_type, id_card_qr_value, status, created_at, updated_at" as const;

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

  const assigned = await isStaffAssignedToShop(supabase, staffRow.id, shopId);
  if (!assigned) {
    return {
      error: "You are not assigned to this shop. Clock in/out is not allowed.",
      status: 403,
    };
  }

  return { staff: staffRow };
}

export function attendanceGpsFieldsFromCheck(gps: GpsLocationMatchResult): {
  staff_latitude: number;
  staff_longitude: number;
  distance_from_shop_meters: number;
  gps_accuracy_meters: number | null;
  gps_verified: boolean;
  matched_gps_location_id?: string | null;
  matched_gps_location_name?: string | null;
  matched_gps_location_type?: string | null;
} {
  const base = {
    staff_latitude: gps.staffLat,
    staff_longitude: gps.staffLng,
    distance_from_shop_meters: Math.round(gps.distanceM * 100) / 100,
    gps_accuracy_meters:
      gps.gpsAccuracyMeters != null
        ? Math.round(gps.gpsAccuracyMeters * 100) / 100
        : null,
    gps_verified: gps.gpsVerified,
  };

  const loc = gps.matchedLocation;
  if (!loc || !gps.gpsVerified) return base;

  const locationId = loc.id.startsWith("legacy-") ? null : loc.id;

  return {
    ...base,
    matched_gps_location_id: locationId,
    matched_gps_location_name: loc.name,
    matched_gps_location_type: loc.location_type,
  };
}

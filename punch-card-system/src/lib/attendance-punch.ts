import { haversineDistanceMeters, isValidLatitude, isValidLongitude, parseCoord } from "@/lib/geo";
import type { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAssignedToShop, resolveStaffForPunch, type StaffCore } from "@/lib/staff";

type Supabase = ReturnType<typeof createAdminClient>;

export type ShopForPunch = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
};

export type GpsCheckResult = {
  staffLat: number;
  staffLng: number;
  distanceM: number;
  radiusM: number;
  gpsVerified: boolean;
};

export const TOO_FAR_MSG = "You are too far from this shop. Clock in/out is not allowed.";

export function parseStaffGps(body: Record<string, unknown>):
  | { ok: true; lat: number; lng: number }
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
  return { ok: true, lat: staffLat, lng: staffLng };
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
  if (shop.latitude == null || shop.longitude == null) {
    return {
      error: "This shop has no GPS location configured. Contact your manager.",
      status: 400,
    };
  }

  return {
    shop: {
      id: shop.id,
      name: shop.name,
      latitude: shop.latitude,
      longitude: shop.longitude,
      allowed_radius_meters: shop.allowed_radius_meters ?? 50,
    },
  };
}

export function checkGpsAgainstShop(
  shop: ShopForPunch,
  staffLat: number,
  staffLng: number,
): GpsCheckResult {
  const distanceM = haversineDistanceMeters(
    staffLat,
    staffLng,
    shop.latitude,
    shop.longitude,
  );
  const radiusM = shop.allowed_radius_meters;
  return {
    staffLat,
    staffLng,
    distanceM,
    radiusM,
    gpsVerified: distanceM <= radiusM,
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

  const staffRow = await resolveStaffForPunch(supabase, {
    staffId,
    staffIdentifier,
  });

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

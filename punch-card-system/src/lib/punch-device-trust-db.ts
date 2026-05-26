import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export const BUDDY_PUNCH_WINDOW_MS = 10 * 60 * 1000;
export const DIFFERENT_SHOP_WINDOW_MS = 30 * 60 * 1000;

export type DeviceTrustResult = {
  deviceId: string | null;
  browserInfo: string | null;
  isNewDevice: boolean;
  deviceTrustStatus: "trusted" | "new_device" | null;
};

export async function resolveDeviceTrust(
  supabase: Supabase,
  params: {
    staffId: string;
    companyId: string | null;
    deviceId: string | null;
    browserInfo: string | null;
  },
): Promise<DeviceTrustResult> {
  const { staffId, companyId, deviceId, browserInfo } = params;
  if (!deviceId || deviceId === "unknown") {
    return {
      deviceId,
      browserInfo,
      isNewDevice: false,
      deviceTrustStatus: null,
    };
  }

  const { data: existing } = await supabase
    .from("staff_trusted_devices")
    .select("id")
    .eq("staff_id", staffId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("staff_trusted_devices")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(browserInfo ? { browser_info: browserInfo.slice(0, 500) } : {}),
      })
      .eq("id", existing.id);

    return {
      deviceId,
      browserInfo,
      isNewDevice: false,
      deviceTrustStatus: "trusted",
    };
  }

  const { count } = await supabase
    .from("staff_trusted_devices")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staffId);

  const isFirstDevice = (count ?? 0) === 0;

  await supabase.from("staff_trusted_devices").insert({
    staff_id: staffId,
    company_id: companyId,
    device_id: deviceId,
    browser_info: browserInfo?.slice(0, 500) ?? null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  });

  return {
    deviceId,
    browserInfo,
    isNewDevice: !isFirstDevice,
    deviceTrustStatus: isFirstDevice ? "trusted" : "new_device",
  };
}

export async function detectBuddyPunchOnDevice(
  supabase: Supabase,
  params: {
    companyId: string | null;
    deviceId: string;
    staffId: string;
    windowMs?: number;
  },
): Promise<boolean> {
  const since = new Date(Date.now() - (params.windowMs ?? BUDDY_PUNCH_WINDOW_MS)).toISOString();

  let query = supabase
    .from("attendance")
    .select("staff_id")
    .eq("punch_device_id", params.deviceId)
    .neq("staff_id", params.staffId)
    .gte("created_at", since)
    .limit(1);

  if (params.companyId) {
    const { data: shopIds } = await supabase
      .from("shops")
      .select("id")
      .eq("company_id", params.companyId);
    const ids = (shopIds ?? []).map((s) => String(s.id));
    if (ids.length === 0) return false;
    query = query.in("shop_id", ids);
  }

  const { data } = await query;
  return (data ?? []).length > 0;
}

export async function detectDifferentShopShortTime(
  supabase: Supabase,
  params: {
    staffId: string;
    shopId: string;
    windowMs?: number;
  },
): Promise<boolean> {
  const since = new Date(Date.now() - (params.windowMs ?? DIFFERENT_SHOP_WINDOW_MS)).toISOString();

  const { data } = await supabase
    .from("attendance")
    .select("shop_id")
    .eq("staff_id", params.staffId)
    .neq("shop_id", params.shopId)
    .gte("created_at", since)
    .limit(1);

  return (data ?? []).length > 0;
}

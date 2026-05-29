import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export const BUDDY_PUNCH_WINDOW_MS = 10 * 60 * 1000;
export const DIFFERENT_SHOP_WINDOW_MS = 30 * 60 * 1000;

export type DeviceTrustResult = {
  deviceId: string | null;
  browserInfo: string | null;
  isNewDevice: boolean;
  deviceTrustStatus: "trusted" | "new_device" | null;
  approved: boolean | null;
};

export async function resolveDeviceTrust(
  supabase: Supabase,
  params: {
    staffId: string;
    companyId: string | null;
    deviceId: string | null;
    browserInfo: string | null;
    deviceName?: string | null;
    osName?: string | null;
  },
): Promise<DeviceTrustResult> {
  const { staffId, companyId, deviceId, browserInfo } = params;
  if (!deviceId) {
    return {
      deviceId,
      browserInfo,
      isNewDevice: false,
      deviceTrustStatus: null,
      approved: null,
    };
  }

  if (deviceId === "unknown") {
    const { count } = await supabase
      .from("staff_trusted_devices")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", staffId);
    const isFirstDevice = (count ?? 0) === 0;
    return {
      deviceId,
      browserInfo,
      isNewDevice: !isFirstDevice,
      deviceTrustStatus: isFirstDevice ? "trusted" : "new_device",
      approved: isFirstDevice,
    };
  }

  const { data: existing } = await supabase
    .from("staff_trusted_devices")
    .select("id, approved, revoked_at")
    .eq("staff_id", staffId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing && !existing.revoked_at) {
    await supabase
      .from("staff_trusted_devices")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(browserInfo ? { browser_info: browserInfo.slice(0, 500) } : {}),
        ...(params.deviceName ? { device_name: params.deviceName.slice(0, 200) } : {}),
        ...(params.osName ? { os_name: params.osName.slice(0, 120) } : {}),
      })
      .eq("id", existing.id);

    const approved = existing.approved === true;
    return {
      deviceId,
      browserInfo,
      isNewDevice: !approved,
      deviceTrustStatus: approved ? "trusted" : "new_device",
      approved,
    };
  }

  const { count } = await supabase
    .from("staff_trusted_devices")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staffId);

  const isFirstDevice = (count ?? 0) === 0;

  const { error: insertErr } = await supabase.from("staff_trusted_devices").insert({
    staff_id: staffId,
    company_id: companyId,
    device_id: deviceId,
    browser_info: browserInfo?.slice(0, 500) ?? null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    device_name: params.deviceName?.slice(0, 200) ?? null,
    os_name: params.osName?.slice(0, 120) ?? null,
    approved: isFirstDevice,
    approved_at: isFirstDevice ? new Date().toISOString() : null,
  });
  if (insertErr) {
    console.error("staff_trusted_devices insert failed", insertErr);
  }

  return {
    deviceId,
    browserInfo,
    isNewDevice: !isFirstDevice,
    deviceTrustStatus: isFirstDevice ? "trusted" : "new_device",
    approved: isFirstDevice,
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

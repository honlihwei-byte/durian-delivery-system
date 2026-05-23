import { buildAttendanceEventFields } from "@/lib/attendance-event-time";
import { fetchAttendanceForDay } from "@/lib/attendance-db";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  DUPLICATE_PREVENTED_AUDIT_PREFIX,
  validateSmartPunch,
  type SmartPunchBlockCode,
} from "@/lib/smart-punch";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type SmartPunchServerBlock = {
  status: 409;
  body: {
    error: string;
    code: SmartPunchBlockCode;
    duplicate_prevented: boolean;
  };
};

export async function enforceSmartPunchOnServer(
  supabase: Supabase,
  params: {
    shopId: string;
    shopName: string;
    staffId: string;
    staffName: string;
    staffCode: string;
    staffType: string;
    actionType: "clock_in" | "clock_out";
  },
): Promise<SmartPunchServerBlock | null> {
  const dayYmd = malaysiaDateYmd(new Date());
  const dayRows = await fetchAttendanceForDay(supabase, dayYmd, params.shopId);
  const staffRows = dayRows.filter((r) => r.staff_id === params.staffId);

  const check = validateSmartPunch(params.actionType, staffRows, params.shopName);
  if (check.ok) return null;

  const { event_date, event_time } = buildAttendanceEventFields();
  await supabase.from("attendance").insert({
    shop_id: params.shopId,
    shop_name: params.shopName,
    staff_id: params.staffId,
    staff_name: params.staffName,
    staff_code: params.staffCode,
    staff_type: params.staffType,
    action_type: params.actionType,
    event_date,
    event_time,
    staff_latitude: null,
    staff_longitude: null,
    distance_from_shop_meters: null,
    gps_accuracy_meters: null,
    gps_verified: false,
    gps_verify_tier: "review_required",
    gps_review_required: false,
    review_required: false,
    photo_proof_used: false,
    verification_method: null,
    audit_notes: check.guardNote.slice(0, 500),
  });

  return {
    status: 409,
    body: {
      error: check.message,
      code: check.code,
      duplicate_prevented: check.guardNote.startsWith(DUPLICATE_PREVENTED_AUDIT_PREFIX),
    },
  };
}

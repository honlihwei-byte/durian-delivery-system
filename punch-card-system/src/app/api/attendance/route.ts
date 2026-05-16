import { NextResponse } from "next/server";
import { ATTENDANCE_SELECT } from "@/lib/attendance-db";
import { buildAttendanceEventFields } from "@/lib/attendance-event-time";
import { formatEventTimeDisplay } from "@/lib/malaysia-time";
import { parseClientDeviceTime } from "@/lib/attendance-audit";
import {
  checkGpsAgainstShop,
  loadShopForPunch,
  parseStaffGps,
  TOO_FAR_MSG,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const shopId = body.shop_id as string | undefined;
    const actionType = body.action_type as string | undefined;
    const staffId = body.staff_id as string | undefined;
    const staffIdentifier = String(body.staff_identifier ?? "").trim();

    if (!shopId || (actionType !== "clock_in" && actionType !== "clock_out")) {
      return NextResponse.json(
        { error: "shop_id and action_type are required" },
        { status: 400 },
      );
    }

    const gpsParsed = parseStaffGps(body as Record<string, unknown>);
    if (!gpsParsed.ok) {
      return NextResponse.json({ error: gpsParsed.error }, { status: 400 });
    }

    const clientDeviceTime = parseClientDeviceTime(body as Record<string, unknown>);
    const { event_date, event_time } = buildAttendanceEventFields();

    const supabase = createAdminClient();

    const shopResult = await loadShopForPunch(supabase, shopId);
    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    const { shop } = shopResult;

    const staffResult = await validateStaffForPunch(supabase, shopId, {
      staffId,
      staffIdentifier: staffIdentifier || undefined,
    });
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }
    const { staff: staffRow } = staffResult;

    const gps = checkGpsAgainstShop(shop, gpsParsed.lat, gpsParsed.lng);

    const attendanceRow: Record<string, unknown> = {
      shop_id: shopId,
      shop_name: shop.name,
      staff_id: staffRow.id,
      staff_name: staffRow.staff_name,
      staff_code: staffRow.staff_code,
      staff_type: staffRow.staff_type,
      action_type: actionType,
      event_date,
      event_time,
      staff_latitude: gps.staffLat,
      staff_longitude: gps.staffLng,
      distance_from_shop_meters: Math.round(gps.distanceM * 100) / 100,
      gps_verified: gps.gpsVerified,
    };

    if (clientDeviceTime) {
      attendanceRow.client_device_time = clientDeviceTime;
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert(attendanceRow)
      .select(ATTENDANCE_SELECT)
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        {
          error: error.message || "Failed to save attendance",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    if (!gps.gpsVerified) {
      return NextResponse.json(
        {
          error: TOO_FAR_MSG,
          gps_verified: false,
          distance_from_shop_meters: data.distance_from_shop_meters,
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      event_date: event_date,
      event_time: formatEventTimeDisplay(
        data.event_time != null ? String(data.event_time) : event_time,
        String(data.created_at),
      ),
      created_at: data.created_at,
      gps_verified: true,
      distance_from_shop_meters: data.distance_from_shop_meters,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

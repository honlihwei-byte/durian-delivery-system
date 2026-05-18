import { NextResponse } from "next/server";
import { ATTENDANCE_FAST_PUNCH_SELECT } from "@/lib/attendance-db";
import { buildAttendanceEventFields } from "@/lib/attendance-event-time";
import {
  attendanceGpsFieldsFromCheck,
  buildGpsVerifyContext,
  checkGpsAgainstLocations,
  loadShopForPunch,
  parsePunchGpsExtras,
  parseStaffGps,
  TOO_FAR_MSG,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import { formatEventTimeDisplay } from "@/lib/malaysia-time";
import { isPunchTimingEnabled, punchTime, punchTimeStart } from "@/lib/punch-timing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const totalStart = punchTimeStart();
  const timings: Record<string, number> = {};

  try {
    const body = await req.json();
    const shopId = body.shop_id as string | undefined;
    const actionType = body.action_type as string | undefined;
    const staffId = body.staff_id as string | undefined;
    const staffIdentifier = String(body.staff_identifier ?? "").trim();
    const fastPunch = body.fast_punch === true;

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

    if (fastPunch && body.gps_verified !== true) {
      return NextResponse.json(
        { error: "GPS must be verified before punch." },
        { status: 400 },
      );
    }

    const { event_date, event_time } = buildAttendanceEventFields();
    const supabase = createAdminClient();

    const parallelStart = punchTimeStart();
    const [shopResult, staffResult] = await Promise.all([
      loadShopForPunch(supabase, shopId),
      validateStaffForPunch(supabase, shopId, {
        staffId,
        staffIdentifier: staffIdentifier || undefined,
      }),
    ]);
    timings.parallel_db_ms = punchTime("API parallel shop+staff", parallelStart);

    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }

    const { shop } = shopResult;
    const { staff: staffRow } = staffResult;

    const extras = parsePunchGpsExtras(body as Record<string, unknown>);
    const verifyContext = buildGpsVerifyContext(shop, extras);

    const distStart = punchTimeStart();
    const gps = checkGpsAgainstLocations(
      shop.locations,
      gpsParsed.lat,
      gpsParsed.lng,
      gpsParsed.accuracyM,
      verifyContext,
    );
    timings.distance_calc_ms = punchTime("Distance calculation", distStart);

    if (!gps.allowsPunch) {
      const gpsFields = attendanceGpsFieldsFromCheck(
        { ...gps, gpsAccuracyMeters: gpsParsed.accuracyM },
        gpsParsed.accuracyM,
      );
      return NextResponse.json(
        {
          error: TOO_FAR_MSG,
          gps_verified: false,
          gps_verify_tier: gpsFields.gps_verify_tier,
          distance_from_shop_meters: gpsFields.distance_from_shop_meters,
        },
        { status: 403 },
      );
    }

    const gpsFields = attendanceGpsFieldsFromCheck(
      { ...gps, gpsAccuracyMeters: gpsParsed.accuracyM },
      gpsParsed.accuracyM,
    );

    const insertRow: Record<string, unknown> = {
      shop_id: shopId,
      shop_name: shop.name,
      staff_id: staffRow.id,
      staff_name: staffRow.staff_name,
      staff_code: staffRow.staff_code,
      staff_type: staffRow.staff_type,
      action_type: actionType,
      event_date,
      event_time,
      staff_latitude: gpsFields.staff_latitude,
      staff_longitude: gpsFields.staff_longitude,
      distance_from_shop_meters: gpsFields.distance_from_shop_meters,
      gps_accuracy_meters: gpsFields.gps_accuracy_meters,
      gps_verified: gpsFields.gps_verified,
      gps_verify_tier: gpsFields.gps_verify_tier,
      gps_sample_count: gpsFields.gps_sample_count,
      gps_sample_spread_meters: gpsFields.gps_sample_spread_meters,
      gps_indoor_session_used: gpsFields.gps_indoor_session_used,
      gps_review_required: gpsFields.gps_review_required,
      ...(gpsFields.matched_gps_location_name
        ? {
            matched_gps_location_id: gpsFields.matched_gps_location_id ?? null,
            matched_gps_location_name: gpsFields.matched_gps_location_name,
            matched_gps_location_type: gpsFields.matched_gps_location_type ?? null,
          }
        : {}),
    };

    const insertStart = punchTimeStart();
    const { data, error } = await supabase
      .from("attendance")
      .insert(insertRow)
      .select(fastPunch ? ATTENDANCE_FAST_PUNCH_SELECT : ATTENDANCE_FAST_PUNCH_SELECT)
      .single();
    timings.supabase_insert_ms = punchTime("Supabase insert", insertStart);

    if (error || !data) {
      console.error(error);
      return NextResponse.json(
        {
          error: error?.message || "Failed to save attendance",
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        },
        { status: 500 },
      );
    }

    const displayTime = formatEventTimeDisplay(
      data.event_time != null ? String(data.event_time) : event_time,
      String(data.created_at ?? new Date().toISOString()),
    );

    timings.total_api_ms = punchTime("API total", totalStart);

    if (isPunchTimingEnabled()) {
      console.log("[punch-timing] server breakdown", timings);
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      event_date,
      event_time: displayTime,
      gps_verified: true,
      distance_from_shop_meters: gpsFields.distance_from_shop_meters,
      ...(isPunchTimingEnabled() ? { _timings: timings } : {}),
    });
  } catch (e) {
    punchTime("API total (error)", totalStart);
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

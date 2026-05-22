import { NextResponse } from "next/server";
import { ATTENDANCE_FAST_PUNCH_SELECT } from "@/lib/attendance-db";
import { buildAttendanceEventFields } from "@/lib/attendance-event-time";
import {
  loadShopForPunch,
  parseStaffGps,
  validatePunchQrToken,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import {
  buildPhotoProofStoragePath,
  PHOTO_PROOF_ALLOWED_TYPES,
  PHOTO_PROOF_BUCKET,
  PHOTO_PROOF_MAX_BYTES,
  photoProofExtension,
} from "@/lib/photo-proof-storage";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { formatEventTimeDisplay } from "@/lib/malaysia-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const shopId = String(form.get("shop_id") ?? "").trim();
    const actionType = String(form.get("action_type") ?? "").trim();
    const staffId = String(form.get("staff_id") ?? "").trim();
    const staffIdentifier = String(form.get("staff_identifier") ?? "").trim();
    const punchQrToken =
      normalizePunchQrToken(form.get("punch_qr_token")) ??
      normalizePunchQrToken(form.get("t"));
    const cameraRequested = form.get("camera_requested") === "true";
    const photoFile = form.get("photo");

    if (!shopId || (actionType !== "clock_in" && actionType !== "clock_out")) {
      return NextResponse.json(
        { error: "shop_id and action_type are required" },
        { status: 400 },
      );
    }

    if (!(photoFile instanceof File) || photoFile.size === 0) {
      return NextResponse.json({ error: "Photo is required." }, { status: 400 });
    }

    if (photoFile.size > PHOTO_PROOF_MAX_BYTES) {
      return NextResponse.json({ error: "Photo is too large (max 5 MB)." }, { status: 400 });
    }

    const mime = (photoFile.type || "image/jpeg").toLowerCase();
    if (!PHOTO_PROOF_ALLOWED_TYPES.has(mime)) {
      return NextResponse.json({ error: "Photo must be JPEG, PNG, or WebP." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const [shopResult, staffResult] = await Promise.all([
      loadShopForPunch(supabase, shopId, { includePhotoProofFlag: true }),
      validateStaffForPunch(supabase, shopId, {
        staffId: staffId || undefined,
        staffIdentifier: staffIdentifier || undefined,
      }),
    ]);

    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }

    const { shop } = shopResult;
    const { staff: staffRow } = staffResult;

    if (!shop.allowPhotoProofFallback) {
      return NextResponse.json(
        { error: "Photo proof is not enabled for this shop." },
        { status: 403 },
      );
    }

    const qrCheck = validatePunchQrToken(shopId, shop.punchQrToken, punchQrToken);
    if (!qrCheck.ok) {
      return NextResponse.json({ error: qrCheck.error }, { status: 403 });
    }

    const gpsBody: Record<string, unknown> = {
      staff_latitude: form.get("staff_latitude"),
      staff_longitude: form.get("staff_longitude"),
      gps_accuracy_meters: form.get("gps_accuracy_meters"),
    };
    const gpsParsed = parseStaffGps(gpsBody);
    const lat = gpsParsed.ok ? gpsParsed.lat : null;
    const lng = gpsParsed.ok ? gpsParsed.lng : null;
    const accuracyM = gpsParsed.ok ? gpsParsed.accuracyM : null;

    const uploadedAt = new Date();
    const { path: storagePath } = buildPhotoProofStoragePath(
      shopId,
      staffRow.id,
      actionType,
      uploadedAt,
    );
    const ext = photoProofExtension(mime);
    const pathWithExt = storagePath.replace(/\.jpg$/, `.${ext}`);

    const bytes = Buffer.from(await photoFile.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(PHOTO_PROOF_BUCKET)
      .upload(pathWithExt, bytes, {
        contentType: mime,
        upsert: false,
      });

    if (uploadErr) {
      console.error(uploadErr);
      return NextResponse.json(
        {
          error:
            uploadErr.message ||
            "Could not upload photo. Ensure bucket attendance-proofs exists in Supabase Storage.",
        },
        { status: 500 },
      );
    }

    const { event_date, event_time } = buildAttendanceEventFields(uploadedAt);
    const gpsStatusNote = String(form.get("gps_status_note") ?? "GPS not verified").slice(0, 200);

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
      staff_latitude: lat,
      staff_longitude: lng,
      distance_from_shop_meters: null,
      gps_accuracy_meters: accuracyM,
      gps_verified: false,
      gps_verify_tier: "review_required",
      gps_review_required: true,
      review_required: true,
      verification_method: "photo_proof",
      photo_proof_used: true,
      photo_proof_path: pathWithExt,
      photo_proof_uploaded_at: uploadedAt.toISOString(),
      audit_notes: cameraRequested
        ? `Photo proof (camera requested). ${gpsStatusNote}`
        : `Photo proof. ${gpsStatusNote}`,
    };

    const { data, error } = await supabase
      .from("attendance")
      .insert(insertRow)
      .select(ATTENDANCE_FAST_PUNCH_SELECT)
      .single();

    if (error || !data) {
      console.error(error);
      await supabase.storage.from(PHOTO_PROOF_BUCKET).remove([pathWithExt]);
      return NextResponse.json(
        { error: error?.message || "Failed to save attendance" },
        { status: 500 },
      );
    }

    const displayTime = formatEventTimeDisplay(
      data.event_time != null ? String(data.event_time) : event_time,
      String(data.created_at ?? uploadedAt.toISOString()),
    );

    return NextResponse.json({
      ok: true,
      id: data.id,
      event_date,
      event_time: displayTime,
      photo_proof_used: true,
      verification_method: "photo_proof",
      review_required: true,
      server_created_at: uploadedAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { generatePunchQrToken } from "@/lib/punch-qr-token";
import { SHOP_GPS_SELECT, shopGpsFromBody } from "@/lib/shop-gps";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught, bodyFromPostgrest } from "@/lib/supabase/errors";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shops")
      .select(SHOP_GPS_SELECT)
      .order("name");
    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }
    return NextResponse.json({ shops: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const gpsParsed = shopGpsFromBody(body as Record<string, unknown>);
    if (!gpsParsed.ok) {
      return NextResponse.json({ error: gpsParsed.error }, { status: 400 });
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shops")
      .insert({
        name,
        latitude: gpsParsed.value.latitude,
        longitude: gpsParsed.value.longitude,
        allowed_radius_meters: gpsParsed.value.allowed_radius_meters,
        gps_indoor_mode: gpsParsed.value.gps_indoor_mode,
        allow_photo_proof_fallback: gpsParsed.value.allow_photo_proof_fallback,
        punch_qr_token: generatePunchQrToken(),
      })
      .select(SHOP_GPS_SELECT)
      .single();
    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }

    if (data.latitude != null && data.longitude != null) {
      try {
        await supabase.from("shop_gps_locations").insert({
          shop_id: data.id,
          name: "Main Entrance",
          latitude: data.latitude,
          longitude: data.longitude,
          allowed_radius_meters: data.allowed_radius_meters ?? 50,
          location_type: "main",
          is_active: true,
          sort_order: 0,
        });
      } catch {
        /* table may not exist yet */
      }
    }

    return NextResponse.json({ shop: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

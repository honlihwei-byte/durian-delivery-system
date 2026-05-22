import { NextResponse } from "next/server";
import { listShopGpsLocations } from "@/lib/shop-gps-locations";
import { SHOP_GPS_SELECT, shopGpsFromBody } from "@/lib/shop-gps";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught, bodyFromPostgrest } from "@/lib/supabase/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shops")
      .select(SHOP_GPS_SELECT)
      .eq("id", shopId)
      .maybeSingle();
    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    let gps_locations: Awaited<ReturnType<typeof listShopGpsLocations>> = [];
    try {
      gps_locations = await listShopGpsLocations(supabase, shopId, true);
    } catch {
      /* legacy DB without migration */
    }

    return NextResponse.json({ shop: data, gps_locations });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
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
      .update({
        name,
        latitude: gpsParsed.value.latitude,
        longitude: gpsParsed.value.longitude,
        allowed_radius_meters: gpsParsed.value.allowed_radius_meters,
        gps_indoor_mode: gpsParsed.value.gps_indoor_mode,
      })
      .eq("id", shopId)
      .select(SHOP_GPS_SELECT)
      .maybeSingle();
    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }
    return NextResponse.json({ shop: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
  try {
    const supabase = createAdminClient();

    const { count: attCount, error: aErr } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);
    if (aErr) {
      console.error(aErr);
      return NextResponse.json(bodyFromPostgrest(aErr), { status: 500 });
    }

    const { count: assignCount, error: sErr } = await supabase
      .from("staff_shop_assignments")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);
    if (sErr) {
      console.error(sErr);
      return NextResponse.json(bodyFromPostgrest(sErr), { status: 500 });
    }

    if ((attCount ?? 0) > 0 || (assignCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete shop with attendance history or staff assignments. Unassign staff first.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("shops").delete().eq("id", shopId);
    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

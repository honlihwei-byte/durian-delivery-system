import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  allocateStaffCode,
  attachAssignments,
  listStaff,
  loadAssignmentsByStaff,
  parseShopIds,
  staffIdsWithAttendance,
  syncStaffShopAssignments,
} from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shopId = url.searchParams.get("shop_id");

  try {
    const supabase = createAdminClient();
    const staff = await listStaff(supabase, { shopId: shopId || null });
    return NextResponse.json({ staff });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const staffName = String(body.staff_name ?? "").trim();
    const staffTypeRaw = body.staff_type as string | undefined;
    const staffType =
      staffTypeRaw === "part_time" || staffTypeRaw === "full_time" ? staffTypeRaw : "full_time";
    const shopIds = parseShopIds(body as Record<string, unknown>);

    if (!staffName) {
      return NextResponse.json({ error: "staff_name is required" }, { status: 400 });
    }
    if (!shopIds || shopIds.length === 0) {
      return NextResponse.json({ error: "At least one shop assignment is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: shops, error: shopsErr } = await supabase
      .from("shops")
      .select("id")
      .in("id", shopIds);
    if (shopsErr) {
      console.error(shopsErr);
      return NextResponse.json({ error: "Failed to verify shops" }, { status: 500 });
    }
    if ((shops ?? []).length !== shopIds.length) {
      return NextResponse.json({ error: "One or more shops not found" }, { status: 404 });
    }

    const staff_code = await allocateStaffCode(supabase);
    const id_card_qr_value = `card-${randomUUID()}`;

    const { data, error } = await supabase
      .from("staff")
      .insert({
        staff_name: staffName,
        staff_code,
        staff_type: staffType,
        id_card_qr_value,
        status: "active",
      })
      .select(
        "id, staff_name, staff_code, staff_type, id_card_qr_value, status, created_at, updated_at",
      )
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        {
          error: error.message || "Failed to create staff",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    await syncStaffShopAssignments(supabase, data.id, shopIds);

    const assignments = await loadAssignmentsByStaff(supabase, [data.id]);
    const withPunches = await staffIdsWithAttendance(supabase);
    const [staff] = attachAssignments([data], assignments, withPunches);

    return NextResponse.json({ staff });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

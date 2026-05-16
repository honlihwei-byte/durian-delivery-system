import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  attachAssignments,
  loadAssignmentsByStaff,
  parseShopIds,
  staffIdsWithAttendance,
  syncStaffShopAssignments,
} from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ staffId: string }> },
) {
  const { staffId } = await ctx.params;
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.staff_name !== undefined) {
      const name = String(body.staff_name).trim();
      if (!name) {
        return NextResponse.json({ error: "staff_name cannot be empty" }, { status: 400 });
      }
      updates.staff_name = name;
    }

    if (body.staff_type !== undefined) {
      if (body.staff_type !== "full_time" && body.staff_type !== "part_time") {
        return NextResponse.json({ error: "staff_type must be full_time or part_time" }, { status: 400 });
      }
      updates.staff_type = body.staff_type;
    }

    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "inactive") {
        return NextResponse.json({ error: "status must be active or inactive" }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.regenerate_id_card === true) {
      updates.id_card_qr_value = `card-${randomUUID()}`;
    }

    const shopIds = body.shop_ids !== undefined ? parseShopIds(body as Record<string, unknown>) : undefined;

    if (Object.keys(updates).length === 0 && shopIds === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (shopIds !== null && shopIds !== undefined) {
      if (shopIds.length === 0) {
        return NextResponse.json({ error: "At least one shop assignment is required" }, { status: 400 });
      }
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
    }

    let data = null;
    if (Object.keys(updates).length > 0) {
      const { data: updated, error } = await supabase
        .from("staff")
        .update(updates)
        .eq("id", staffId)
        .select(
          "id, staff_name, staff_code, staff_type, id_card_qr_value, status, created_at, updated_at",
        )
        .maybeSingle();

      if (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
      }
      if (!updated) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      data = updated;
    } else {
      const { data: existing, error } = await supabase
        .from("staff")
        .select(
          "id, staff_name, staff_code, staff_type, id_card_qr_value, status, created_at, updated_at",
        )
        .eq("id", staffId)
        .maybeSingle();
      if (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
      }
      if (!existing) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      data = existing;
    }

    if (shopIds !== null && shopIds !== undefined) {
      await syncStaffShopAssignments(supabase, staffId, shopIds);
    }

    const assignments = await loadAssignmentsByStaff(supabase, [staffId]);
    const withPunches = await staffIdsWithAttendance(supabase);
    const [staff] = attachAssignments([data], assignments, withPunches);

    return NextResponse.json({ staff });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ staffId: string }> },
) {
  const { staffId } = await ctx.params;
  try {
    const supabase = createAdminClient();

    const { count, error: cErr } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", staffId);

    if (cErr) {
      console.error(cErr);
      return NextResponse.json({ error: "Could not verify attendance" }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete staff with attendance history. Set inactive instead." },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("staff").delete().eq("id", staffId);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

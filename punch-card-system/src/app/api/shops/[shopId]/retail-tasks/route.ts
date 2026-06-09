import { NextResponse } from "next/server";
import { loadShopForPunch, validateStaffForPunch } from "@/lib/attendance-punch";
import { listRetailTasks } from "@/lib/retail-tasks/retail-tasks-db";
import { tickTaskRecurrence } from "@/lib/retail-tasks/task-recurrence";
import { canViewTask, type TaskActor } from "@/lib/retail-tasks/task-permissions";
import { ensureStaffPermissionProfile } from "@/lib/permissions/staff-permissions-db";
import { todayYmd } from "@/lib/retail-tasks/task-status";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const shopResult = await loadShopForPunch(supabase, shopId);
    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if (!shopResult.shop.companyId) {
      return NextResponse.json({ error: "Shop company not configured" }, { status: 400 });
    }

    const url = new URL(req.url);
    const staffId = url.searchParams.get("staff_id")?.trim();
    const date = url.searchParams.get("date")?.trim() || todayYmd();

    if (!staffId) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }

    const staffResult = await validateStaffForPunch(supabase, shopId, { staffId });
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }

    const profile = await ensureStaffPermissionProfile(supabase, {
      company_id: shopResult.shop.companyId,
      staff_id: staffId,
    });
    const actor: TaskActor = {
      kind: "staff",
      staffId,
      name: staffResult.staff.staff_name,
      profile,
    };

    await tickTaskRecurrence(supabase, shopResult.shop.companyId);

    const rows = await listRetailTasks(supabase, {
      companyId: shopResult.shop.companyId,
      shopId,
      from: date,
      to: date,
    });

    const tasks = rows.filter((t) => canViewTask(t, actor));
    return NextResponse.json({
      tasks,
      staff: staffResult.staff,
      role_template: profile.role_template,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { loadShopForPunch, validateStaffForPunch } from "@/lib/attendance-punch";
import {
  getStaffShopIds,
  getStaffTaskRole,
  listRetailTasks,
} from "@/lib/retail-tasks/retail-tasks-db";
import { canViewTask, type TaskActor } from "@/lib/retail-tasks/task-permissions";
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

    const taskRole = await getStaffTaskRole(supabase, shopResult.shop.companyId, staffId);
    const shopIds = await getStaffShopIds(supabase, staffId);
    const actor: TaskActor = {
      kind: "staff",
      staffId,
      name: staffResult.staff.staff_name,
      taskRole,
      shopIds,
    };

    const rows = await listRetailTasks(supabase, {
      companyId: shopResult.shop.companyId,
      shopId,
      from: date,
      to: date,
    });

    const tasks = rows.filter((t) => canViewTask(t, actor));
    return NextResponse.json({ tasks, staff: staffResult.staff, task_role: taskRole });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

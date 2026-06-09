import { NextResponse } from "next/server";
import { isNextResponse, requireEmployeeSession, requireEmployeePermission, employeeTaskActor } from "@/lib/employee-api-auth";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import { listRetailTasks } from "@/lib/retail-tasks/retail-tasks-db";
import { tickTaskRecurrence } from "@/lib/retail-tasks/task-recurrence";
import { canSubmitTask, canViewTask } from "@/lib/retail-tasks/task-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const actor = await requireEmployeeSession(req, supabase);
    if (isNextResponse(actor)) return actor;

    const deny = requireEmployeePermission(actor, "tasks.view_own");
    if (deny) return deny;

    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id")?.trim();
    const date = url.searchParams.get("date")?.trim() || malaysiaDateYmd(new Date());

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    await tickTaskRecurrence(supabase, actor.companyId);

    const rows = await listRetailTasks(supabase, {
      companyId: actor.companyId,
      shopId,
      from: date,
      to: date,
      staffId: actor.staffId,
    });

    const tasks = rows.filter((t) => canViewTask(t, employeeTaskActor(actor)));
    return NextResponse.json({ tasks });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

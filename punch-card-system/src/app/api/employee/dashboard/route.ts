import { NextResponse } from "next/server";
import { fetchAttendanceForDay } from "@/lib/attendance-db";
import { isNextResponse, requireEmployeeSession, employeeTaskActor } from "@/lib/employee-api-auth";
import { resolveEmployeeClockContext } from "@/lib/employee-clock-context";
import { countUnreadNotifications } from "@/lib/employee-notifications-db";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import { listRetailTasks } from "@/lib/retail-tasks/retail-tasks-db";
import { canViewTask } from "@/lib/retail-tasks/task-permissions";
import { buildStaffTodayStatusSummary } from "@/lib/staff-day-status";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const actor = await requireEmployeeSession(req, supabase);
    if (isNextResponse(actor)) return actor;

    const clockContext = await resolveEmployeeClockContext(supabase, {
      staff_id: actor.staffId,
      company_id: actor.companyId,
    });

    const today = malaysiaDateYmd(new Date());
    const shopId = clockContext.selected_shop_id;

    let todayStatus = null;
    if (shopId) {
      const rows = (await fetchAttendanceForDay(supabase, today, shopId)).filter(
        (r) => r.staff_id === actor.staffId,
      );
      todayStatus = buildStaffTodayStatusSummary(rows, today);
    }

    const tasks = shopId
      ? (
          await listRetailTasks(supabase, {
            companyId: actor.companyId,
            shopId,
            from: today,
            to: today,
            staffId: actor.staffId,
          })
        ).filter((t) => canViewTask(t, employeeTaskActor(actor)))
      : [];

    const pendingTasks = tasks.filter((t) =>
      ["pending", "in_progress", "submitted", "rejected"].includes(t.status),
    ).length;

    const unread = await countUnreadNotifications(supabase, actor.staffId);

    return NextResponse.json({
      clock_context: clockContext,
      today_status: todayStatus,
      pending_tasks: pendingTasks,
      unread_notifications: unread,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

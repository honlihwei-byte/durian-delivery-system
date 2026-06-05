import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import {
  createTaskVerification,
  getLatestSubmission,
  getRetailTaskById,
  setTaskStatus,
} from "@/lib/retail-tasks/retail-tasks-db";
import { notifyStaffTask } from "@/lib/retail-tasks/task-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const task = await getRetailTaskById(supabase, taskId);
    if (!task || task.company_id !== scope.companyId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.status !== "submitted") {
      return NextResponse.json({ error: "Task is not awaiting verification" }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const decision = body.decision === "rejected" ? "rejected" : "approved";
    const rejection_reason =
      decision === "rejected" ? String(body.rejection_reason ?? "").trim() : null;

    if (decision === "rejected" && !rejection_reason) {
      return NextResponse.json({ error: "rejection_reason is required" }, { status: 400 });
    }

    const submission = await getLatestSubmission(supabase, taskId);
    const verifierStaffId =
      task.verifier_staff_id ?? submission?.submitted_by ?? task.assigned_staff_id;
    if (!verifierStaffId) {
      return NextResponse.json({ error: "No verifier configured for this task" }, { status: 400 });
    }

    await createTaskVerification(supabase, {
      task_id: taskId,
      submission_id: submission?.id ?? null,
      verifier_id: verifierStaffId,
      decision,
      rejection_reason,
    });

    const newStatus = decision === "approved" ? "verified" : "pending";
    const updated = await setTaskStatus(
      supabase,
      taskId,
      newStatus,
      { name: scope.session.companyName ?? "Admin", role: "company_admin" },
      decision === "approved" ? "verified" : "rejected",
      rejection_reason ?? (decision === "rejected" ? "Returned to pending" : undefined),
    );

    if (task.assigned_staff_id) {
      await notifyStaffTask(supabase, {
        company_id: task.company_id,
        staff_id: task.assigned_staff_id,
        shop_id: task.shop_id,
        notification_type: decision === "approved" ? "task_verified" : "task_rejected",
        title: decision === "approved" ? "Task verified" : "Task rejected",
        body: task.title,
      });
    }

    return NextResponse.json({ ok: true, task: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

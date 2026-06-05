import { NextResponse } from "next/server";
import { loadShopForPunch, validateStaffForPunch } from "@/lib/attendance-punch";
import {
  createTaskFeedback,
  createTaskSubmission,
  createTaskVerification,
  getLatestSubmission,
  getRetailTaskById,
  getStaffShopIds,
  getStaffTaskRole,
  getTaskDetailBundle,
  setTaskStatus,
} from "@/lib/retail-tasks/retail-tasks-db";
import { logTaskActivity } from "@/lib/retail-tasks/task-activity";
import {
  canReportException,
  canStartTask,
  canSubmitTask,
  canVerifyTask,
  canViewTask,
  type TaskActor,
} from "@/lib/retail-tasks/task-permissions";
import { verifyTaskGps } from "@/lib/retail-tasks/task-gps";
import { notifyStaffTask } from "@/lib/retail-tasks/task-notifications";
import { FEEDBACK_REASON_TYPES } from "@/lib/retail-tasks/types";
import { createAdminClient } from "@/lib/supabase/admin";

async function staffActor(
  supabase: ReturnType<typeof createAdminClient>,
  shopId: string,
  staffId: string,
  companyId: string,
): Promise<TaskActor | NextResponse> {
  const staffResult = await validateStaffForPunch(supabase, shopId, { staffId });
  if ("error" in staffResult) {
    return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
  }
  const taskRole = await getStaffTaskRole(supabase, companyId, staffId);
  const shopIds = await getStaffShopIds(supabase, staffId);
  return {
    kind: "staff",
    staffId,
    name: staffResult.staff.staff_name,
    taskRole,
    shopIds,
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ shopId: string; taskId: string }> },
) {
  const { shopId, taskId } = await ctx.params;
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
    if (!staffId) return NextResponse.json({ error: "staff_id is required" }, { status: 400 });

    const actor = await staffActor(supabase, shopId, staffId, shopResult.shop.companyId);
    if (actor instanceof NextResponse) return actor;

    const bundle = await getTaskDetailBundle(supabase, taskId);
    if (!bundle || bundle.task.shop_id !== shopId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!canViewTask(bundle.task, actor)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(bundle);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ shopId: string; taskId: string }> },
) {
  const { shopId, taskId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const shopResult = await loadShopForPunch(supabase, shopId);
    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if (!shopResult.shop.companyId) {
      return NextResponse.json({ error: "Shop company not configured" }, { status: 400 });
    }
    const companyId = shopResult.shop.companyId;

    const body = (await req.json()) as Record<string, unknown>;
    const staffId = String(body.staff_id ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!staffId) return NextResponse.json({ error: "staff_id is required" }, { status: 400 });

    const actor = await staffActor(supabase, shopId, staffId, companyId);
    if (actor instanceof NextResponse) return actor;
    if (actor.kind !== "staff") return NextResponse.json({ error: "Invalid actor" }, { status: 400 });

    const task = await getRetailTaskById(supabase, taskId);
    if (!task || task.shop_id !== shopId || task.company_id !== companyId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!canViewTask(task, actor)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (action === "start") {
      if (!canStartTask(task, actor)) {
        return NextResponse.json({ error: "Cannot start this task" }, { status: 403 });
      }
      const updated = await setTaskStatus(
        supabase,
        taskId,
        "in_progress",
        { id: staffId, name: actor.name, role: actor.taskRole },
        "started",
        undefined,
        { started_at: new Date().toISOString(), started_by: staffId },
      );
      return NextResponse.json({ ok: true, task: updated });
    }

    if (action === "submit") {
      if (!canSubmitTask(task, actor)) {
        return NextResponse.json({ error: "Cannot submit this task" }, { status: 403 });
      }
      if (task.photo_required && !body.photo_url) {
        return NextResponse.json({ error: "Photo proof is required" }, { status: 400 });
      }

      let gpsFields: {
        gps_lat?: number | null;
        gps_lng?: number | null;
        gps_distance_meters?: number | null;
        gps_status?: string | null;
      } = {};

      if (task.gps_required) {
        const gps = await verifyTaskGps(supabase, shopId, body);
        if ("error" in gps) {
          return NextResponse.json({ error: gps.error }, { status: 400 });
        }
        gpsFields = gps;
      }

      const submission = await createTaskSubmission(supabase, {
        task_id: taskId,
        submitted_by: staffId,
        photo_url: body.photo_url ? String(body.photo_url) : null,
        comment: body.comment ? String(body.comment) : null,
        ...gpsFields,
      });

      if (body.photo_url) {
        await logTaskActivity(supabase, {
          task_id: taskId,
          actor_id: staffId,
          actor_name: actor.name,
          actor_role: actor.taskRole,
          action_type: "photo_uploaded",
          note: "Photo attached",
        });
      }

      const updated = await setTaskStatus(
        supabase,
        taskId,
        "submitted",
        { id: staffId, name: actor.name, role: actor.taskRole },
        "submitted",
        body.comment ? String(body.comment) : undefined,
      );

      if (task.verifier_staff_id) {
        await notifyStaffTask(supabase, {
          company_id: task.company_id,
          staff_id: task.verifier_staff_id,
          shop_id: shopId,
          notification_type: "task_submitted",
          title: "Task awaiting verification",
          body: task.title,
        });
      }

      return NextResponse.json({ ok: true, task: updated, submission });
    }

    if (action === "verify") {
      if (!canVerifyTask(task, actor)) {
        return NextResponse.json({ error: "Only appointed verifier can approve" }, { status: 403 });
      }
      const decision = body.decision === "rejected" ? "rejected" : "approved";
      const rejection_reason =
        decision === "rejected" ? String(body.rejection_reason ?? "").trim() : null;
      if (decision === "rejected" && !rejection_reason) {
        return NextResponse.json({ error: "rejection_reason is required" }, { status: 400 });
      }

      const submission = await getLatestSubmission(supabase, taskId);
      await createTaskVerification(supabase, {
        task_id: taskId,
        submission_id: submission?.id ?? null,
        verifier_id: staffId,
        decision,
        rejection_reason,
      });

      const newStatus = decision === "approved" ? "verified" : "pending";
      const updated = await setTaskStatus(
        supabase,
        taskId,
        newStatus,
        { id: staffId, name: actor.name, role: actor.taskRole },
        decision === "approved" ? "verified" : "rejected",
        rejection_reason ?? undefined,
      );

      return NextResponse.json({ ok: true, task: updated });
    }

    if (action === "exception") {
      if (!canReportException(task, actor)) {
        return NextResponse.json({ error: "Cannot report exception" }, { status: 403 });
      }
      const reason_type = String(body.reason_type ?? "").trim();
      const reason_text = String(body.reason_text ?? "").trim();
      if (!FEEDBACK_REASON_TYPES.includes(reason_type as (typeof FEEDBACK_REASON_TYPES)[number])) {
        return NextResponse.json({ error: "Invalid reason_type" }, { status: 400 });
      }
      if (!reason_text) {
        return NextResponse.json({ error: "reason_text is required" }, { status: 400 });
      }

      await createTaskFeedback(supabase, {
        task_id: taskId,
        submitted_by: staffId,
        reason_type,
        reason_text,
        photo_url: body.photo_url ? String(body.photo_url) : null,
      });

      const updated = await setTaskStatus(
        supabase,
        taskId,
        "exception_reported",
        { id: staffId, name: actor.name, role: actor.taskRole },
        "exception_reported",
        reason_text,
      );

      return NextResponse.json({ ok: true, task: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

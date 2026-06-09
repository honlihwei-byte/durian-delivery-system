import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { assertOpsShopScope, requireOpsFeatureAccess } from "@/lib/ops-api-auth";
import { listRetailTasks } from "@/lib/retail-tasks/retail-tasks-db";
import { dispatchToMany } from "@/lib/notifications/notification-service";
import { resolveTaskNotificationRecipients } from "@/lib/notifications/task-recipient-resolver";
import type { TaskNotificationSettings } from "@/lib/notifications/types";
import { createRecurringRetailTasks, tickTaskRecurrence } from "@/lib/retail-tasks/task-recurrence";
import { normalizeChecklistItems } from "@/lib/retail-tasks/task-checklist";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_REPEAT_TYPES,
  type TaskCategory,
  type TaskPriority,
  type TaskRepeatType,
} from "@/lib/retail-tasks/types";
import { createAdminClient } from "@/lib/supabase/admin";

function ymd(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("due_date must be YYYY-MM-DD");
  return s;
}

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const scope = await requireOpsFeatureAccess(req, supabase, {
      permissions: ["tasks.view_shop", "tasks.view_own", "tasks.create", "tasks.assign"],
    });
    if (isNextResponse(scope)) return scope;

    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id")?.trim() || undefined;
    const staffId = url.searchParams.get("staff_id")?.trim() || undefined;
    const from = url.searchParams.get("from")?.trim() || undefined;
    const to = url.searchParams.get("to")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim() || undefined;

    if (shopId) {
      const deny = await assertOpsShopScope(supabase, scope, shopId);
      if (deny) return deny;
    }

    await tickTaskRecurrence(supabase, scope.companyId);

    const rows = await listRetailTasks(supabase, {
      companyId: scope.companyId,
      shopId,
      staffId,
      from,
      to,
      status,
    });

    return NextResponse.json({ tasks: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const scope = await requireOpsFeatureAccess(req, supabase, {
      permissions: ["tasks.create", "tasks.assign"],
    });
    if (isNextResponse(scope)) return scope;

    const body = (await req.json()) as Record<string, unknown>;
    const shop_id = String(body.shop_id ?? "").trim();
    const title = String(body.title ?? "").trim();
    const due_date = ymd(body.due_date);
    const category = String(body.category ?? "").trim() as TaskCategory;

    if (!shop_id || !title || !due_date) {
      return NextResponse.json({ error: "shop_id, title, due_date are required" }, { status: 400 });
    }
    if (!TASK_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const priority = String(body.priority ?? "normal") as TaskPriority;
    const repeat_type = String(body.repeat_type ?? "one_time") as TaskRepeatType;
    if (!TASK_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    if (!TASK_REPEAT_TYPES.includes(repeat_type)) {
      return NextResponse.json({ error: "Invalid repeat_type" }, { status: 400 });
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id, company_id")
      .eq("id", shop_id)
      .eq("company_id", scope.companyId)
      .maybeSingle();
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const shopDeny = await assertOpsShopScope(supabase, scope, shop_id);
    if (shopDeny) return shopDeny;

    const assigned_staff_id = body.assigned_staff_id
      ? String(body.assigned_staff_id).trim()
      : null;
    const verifier_staff_id = body.verifier_staff_id
      ? String(body.verifier_staff_id).trim()
      : null;
    const due_time = body.due_time ? String(body.due_time).slice(0, 5) : null;

    const min_photos = Math.max(0, Number(body.min_photos ?? (body.photo_required === true ? 1 : 0)) || 0);
    const photo_capture_mode =
      String(body.photo_capture_mode ?? "camera_only") === "camera_or_gallery"
        ? "camera_or_gallery"
        : "camera_only";
    const checklist_items = normalizeChecklistItems(body.checklist_items);

    const createdBy =
      scope.kind === "admin"
        ? (scope.admin.session.companyCode ?? scope.admin.session.companyName ?? "admin")
        : scope.actor.staffName;
    const actorMeta =
      scope.kind === "admin"
        ? { name: scope.admin.session.companyName ?? "Admin", role: "company_admin" as const }
        : {
            name: scope.actor.staffName,
            role: scope.actor.permissionProfile.role_template,
          };

    const reminderRaw = String(body.reminder_minutes ?? "").trim();
    const notification: TaskNotificationSettings = {
      notify_assigned_staff: body.notify_assigned_staff !== false,
      notify_supervisor: body.notify_supervisor === true,
      notify_store_manager: body.notify_store_manager === true,
      reminder_offset_minutes:
        reminderRaw === "15" || reminderRaw === "30" || reminderRaw === "60"
          ? Number(reminderRaw)
          : null,
    };

    const tasks = await createRecurringRetailTasks(
      supabase,
      {
        company_id: scope.companyId,
        shop_id,
        assigned_staff_id: assigned_staff_id || null,
        verifier_staff_id: verifier_staff_id || null,
        title,
        description: body.description ? String(body.description) : null,
        category,
        priority,
        status: "pending",
        due_date,
        due_time,
        repeat_type,
        photo_required: min_photos > 0,
        min_photos,
        photo_capture_mode,
        checklist_items,
        gps_required: body.gps_required === true,
        feedback_allowed: body.feedback_allowed !== false,
        created_by: createdBy,
      },
      actorMeta,
      notification,
    );
    const task = tasks[0];
    if (!task) {
      return NextResponse.json({ error: "Could not create task" }, { status: 500 });
    }

    const recipients = await resolveTaskNotificationRecipients(supabase, {
      company_id: scope.companyId,
      shop_id,
      assigned_staff_id: assigned_staff_id || null,
      settings: notification,
    });
    if (recipients.length > 0) {
      const dueLabel = `${due_date}${due_time ? ` ${due_time}` : ""}`;
      await dispatchToMany(supabase, recipients, {
        company_id: scope.companyId,
        shop_id,
        type: "task_assigned",
        title: "New task assigned",
        message: `${title} — due ${dueLabel}`,
        related_task_id: task.id,
        fire_key: "new",
        link_path: `/employee/tasks?shop_id=${encodeURIComponent(shop_id)}`,
      });
    }

    return NextResponse.json({
      ok: true,
      task,
      tasks,
      series_id: task.series_id,
      instances_created: tasks.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

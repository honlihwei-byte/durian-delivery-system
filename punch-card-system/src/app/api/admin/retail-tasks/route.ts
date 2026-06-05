import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import {
  createRetailTask,
  listRetailTasks,
} from "@/lib/retail-tasks/retail-tasks-db";
import { notifyStaffTask } from "@/lib/retail-tasks/task-notifications";
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
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id")?.trim() || undefined;
    const staffId = url.searchParams.get("staff_id")?.trim() || undefined;
    const from = url.searchParams.get("from")?.trim() || undefined;
    const to = url.searchParams.get("to")?.trim() || undefined;
    const status = url.searchParams.get("status")?.trim() || undefined;

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
    const scope = await requireCompanyFeatureAccess(req, supabase);
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

    const assigned_staff_id = body.assigned_staff_id
      ? String(body.assigned_staff_id).trim()
      : null;
    const verifier_staff_id = body.verifier_staff_id
      ? String(body.verifier_staff_id).trim()
      : null;
    const due_time = body.due_time ? String(body.due_time).slice(0, 5) : null;

    const task = await createRetailTask(
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
        photo_required: body.photo_required === true,
        gps_required: body.gps_required === true,
        feedback_allowed: body.feedback_allowed !== false,
        created_by: scope.session.companyCode ?? scope.session.companyName ?? "admin",
      },
      { name: scope.session.companyName ?? "Admin", role: "company_admin" },
    );

    if (assigned_staff_id) {
      await notifyStaffTask(supabase, {
        company_id: scope.companyId,
        staff_id: assigned_staff_id,
        shop_id,
        notification_type: "task_assigned",
        title: "New task assigned",
        body: title,
      });
    }

    return NextResponse.json({ ok: true, task });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

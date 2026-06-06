import { NextResponse } from "next/server";
import {
  isNextResponse,
  requireEmployeeSession,
} from "@/lib/employee-api-auth";
import {
  countUnreadNotifications,
  listEmployeeNotifications,
  markNotificationRead,
} from "@/lib/employee-notifications-db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const actor = await requireEmployeeSession(req, supabase);
    if (isNextResponse(actor)) return actor;

    const notifications = await listEmployeeNotifications(supabase, actor.staffId);
    const unread = await countUnreadNotifications(supabase, actor.staffId);
    return NextResponse.json({ notifications, unread });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createAdminClient();
    const actor = await requireEmployeeSession(req, supabase);
    if (isNextResponse(actor)) return actor;

    const body = await req.json();
    const notificationId = String(body.notification_id ?? "").trim();
    if (!notificationId) {
      return NextResponse.json({ error: "notification_id required" }, { status: 400 });
    }

    await markNotificationRead(supabase, actor.staffId, notificationId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

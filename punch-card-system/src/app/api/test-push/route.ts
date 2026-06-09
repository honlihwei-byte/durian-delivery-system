import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isNextResponse, requireEmployeeSession } from "@/lib/employee-api-auth";
import {
  getStaffNotificationPreferences,
  listPushSubscriptionsForStaff,
} from "@/lib/notifications/ops-notifications-db";
import {
  checkPushSubscriptionsTable,
  getVapidAuditStatus,
  sendBrowserPushToStaff,
} from "@/lib/notifications/web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function serviceWorkerOnDisk(): Promise<boolean> {
  try {
    await readFile(path.join(process.cwd(), "public", "sw.js"), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function serviceWorkerDeployed(origin: string): Promise<{
  accessible: boolean;
  status: number | null;
}> {
  try {
    const res = await fetch(`${origin}/sw.js`, { method: "GET", cache: "no-store" });
    return { accessible: res.ok, status: res.status };
  } catch {
    return { accessible: false, status: null };
  }
}

/** Audit browser push infrastructure + optional session subscription state. */
export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const origin = new URL(req.url).origin;
    const vapid = getVapidAuditStatus();
    const table = await checkPushSubscriptionsTable(supabase);
    const onDisk = await serviceWorkerOnDisk();
    const deployed = await serviceWorkerDeployed(origin);

    const actor = await requireEmployeeSession(req, supabase);
    let session: Record<string, unknown> = { authenticated: false };
    if (!isNextResponse(actor)) {
      const prefs = await getStaffNotificationPreferences(
        supabase,
        actor.staffId,
        actor.companyId,
      );
      const subs = await listPushSubscriptionsForStaff(supabase, actor.staffId);
      session = {
        authenticated: true,
        staff_id: actor.staffId,
        staff_name: actor.staffName,
        notifications_enabled: prefs.notifications_enabled,
        push_enabled: prefs.push_enabled,
        subscription_count: subs.length,
        browser_permission: "check client-side via Notification.permission",
      };
    }

    const checks = [
      { id: 1, name: "VAPID_PUBLIC_KEY loaded", pass: vapid.public_key_loaded },
      { id: 2, name: "VAPID_PRIVATE_KEY loaded", pass: vapid.private_key_loaded },
      { id: 3, name: "VAPID_SUBJECT loaded", pass: vapid.subject_loaded },
      { id: 4, name: "Service worker file exists (public/sw.js)", pass: onDisk },
      { id: 5, name: "Service worker reachable over HTTP", pass: deployed.accessible },
      { id: 6, name: "staff_push_subscriptions table exists", pass: table.exists },
      {
        id: 7,
        name: "Push ready (VAPID + table)",
        pass: vapid.push_available && table.exists,
      },
    ];

    return NextResponse.json({
      ok: checks.every((c) => c.pass),
      checks,
      vapid: {
        ...vapid,
        private_key_loaded: vapid.private_key_loaded,
      },
      service_worker: {
        path: "/sw.js",
        on_disk: onDisk,
        deployed_url: `${origin}/sw.js`,
        http_status: deployed.status,
        accessible: deployed.accessible,
      },
      database: table,
      session,
      notification_bell: {
        employee_api: "/api/employee/notifications",
        admin_api: "/api/admin/notifications",
        note: "Bell polls these APIs for unread count and preview list.",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

/** Send a test browser push to the logged-in employee's saved subscriptions. */
export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const actor = await requireEmployeeSession(req, supabase);
    if (isNextResponse(actor)) return actor;

    const vapid = getVapidAuditStatus();
    if (!vapid.push_available) {
      return NextResponse.json(
        {
          error: "Push not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on the server.",
          vapid,
        },
        { status: 503 },
      );
    }

    const table = await checkPushSubscriptionsTable(supabase);
    if (!table.exists) {
      return NextResponse.json(
        {
          error: "staff_push_subscriptions table missing. Apply migration 068_notification_center.sql.",
          database: table,
        },
        { status: 503 },
      );
    }

    const subs = await listPushSubscriptionsForStaff(supabase, actor.staffId);
    if (subs.length === 0) {
      return NextResponse.json(
        {
          error: "No push subscription for this employee. Enable push in Employee Settings first.",
          hint: "Settings → Turn on push → allow browser permission",
        },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = String(body.title ?? "LW OpsFlow test push").trim();
    const message = String(
      body.message ?? "Browser push is working. You can close this notification.",
    ).trim();

    const result = await sendBrowserPushToStaff(supabase, {
      staff_id: actor.staffId,
      title,
      body: message,
      url: "/employee/notifications",
    });

    return NextResponse.json({
      ok: result.sent > 0,
      sent: result.sent,
      failed: result.failed,
      subscription_count: subs.length,
      staff_id: actor.staffId,
      message:
        result.sent > 0
          ? "Test push sent. Check your device notification tray."
          : "Push send failed for all subscriptions. Re-enable push in Settings.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

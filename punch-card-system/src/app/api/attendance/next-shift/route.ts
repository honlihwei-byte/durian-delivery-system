import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadShopForPunch, validateStaffForPunch } from "@/lib/attendance-punch";

function ymdToday(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Public (clock page): show next shift for selected staff. QR routes unchanged. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id")?.trim() ?? "";
    const staffId = url.searchParams.get("staff_id")?.trim() ?? "";
    const staffIdentifier = url.searchParams.get("staff_identifier")?.trim() ?? "";

    if (!shopId) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    if (!staffId && !staffIdentifier) {
      return NextResponse.json({ next_shift: null });
    }

    const supabase = createAdminClient();
    const shopRes = await loadShopForPunch(supabase, shopId);
    if ("error" in shopRes) return NextResponse.json({ error: shopRes.error }, { status: shopRes.status });

    const staffRes = await validateStaffForPunch(supabase, shopId, {
      staffId: staffId || undefined,
      staffIdentifier: staffIdentifier || undefined,
    });
    if ("error" in staffRes) return NextResponse.json({ error: staffRes.error }, { status: staffRes.status });

    const today = ymdToday();
    const { data, error } = await supabase
      .from("staff_schedules")
      .select("id, shift_date, start_time, end_time, break_minutes, shop_id, staff_id, status")
      .eq("staff_id", staffRes.staff.id)
      .eq("status", "active")
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1);

    if (error) {
      // If migration not applied yet, just return null.
      return NextResponse.json({ next_shift: null });
    }

    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    if (!row) return NextResponse.json({ next_shift: null });

    return NextResponse.json({
      next_shift: {
        id: String(row.id),
        shift_date: String(row.shift_date),
        start_time: String(row.start_time).slice(0, 5),
        end_time: String(row.end_time).slice(0, 5),
        break_minutes: Number(row.break_minutes ?? 0) || 0,
        shop_id: String(row.shop_id),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


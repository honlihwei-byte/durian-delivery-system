import { NextResponse } from "next/server";
import { isNextResponse, requireEmployeeSession } from "@/lib/employee-api-auth";
import { resolveEmployeeClockContext } from "@/lib/employee-clock-context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const actor = await requireEmployeeSession(req, supabase);
    if (isNextResponse(actor)) return actor;

    const url = new URL(req.url);
    const shopOverride = url.searchParams.get("shop_id")?.trim();

    const context = await resolveEmployeeClockContext(supabase, {
      staff_id: actor.staffId,
      company_id: actor.companyId,
    });

    if (shopOverride) {
      const allowed = context.assigned_shops.some((s) => s.id === shopOverride);
      if (!allowed) {
        return NextResponse.json({ error: "Shop not assigned." }, { status: 403 });
      }
      return NextResponse.json({
        ...context,
        selected_shop_id: shopOverride,
        resolution: context.resolution === "pick_shop" ? "pick_shop" : context.resolution,
        can_clock: true,
        block_message: null,
      });
    }

    return NextResponse.json(context);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

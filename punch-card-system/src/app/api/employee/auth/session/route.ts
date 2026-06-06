import { NextResponse } from "next/server";
import { employeeSessionFromRequest } from "@/lib/employee-auth";
import { getEmployeeAccountByStaffId } from "@/lib/employee-accounts-db";
import { ensureStaffPermissionProfile } from "@/lib/permissions/staff-permissions-db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const session = employeeSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    const supabase = createAdminClient();
    const account = await getEmployeeAccountByStaffId(supabase, session.staffId);
    if (!account || account.status !== "active") {
      return NextResponse.json({ authenticated: false });
    }

    const profile = await ensureStaffPermissionProfile(supabase, {
      company_id: session.companyId,
      staff_id: session.staffId,
    });

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.companyId)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      staff_id: session.staffId,
      staff_name: session.staffName,
      company_id: session.companyId,
      company_name: company?.name ?? "",
      role_template: profile.role_template,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ authenticated: false });
  }
}

import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import {
  createEmployeeAccount,
  getEmployeeAccountByStaffId,
  setEmployeeAccountStatus,
  updateEmployeeAccountPassword,
} from "@/lib/employee-accounts-db";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteCtx = { params: Promise<{ staffId: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { staffId } = await ctx.params;
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const { data: staff } = await supabase
      .from("staff")
      .select("id, company_id")
      .eq("id", staffId)
      .eq("company_id", scope.companyId)
      .maybeSingle();
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const account = await getEmployeeAccountByStaffId(supabase, staffId);
    return NextResponse.json({ account });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { staffId } = await ctx.params;
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const { data: staff } = await supabase
      .from("staff")
      .select("id, company_id")
      .eq("id", staffId)
      .eq("company_id", scope.companyId)
      .maybeSingle();
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const existing = await getEmployeeAccountByStaffId(supabase, staffId);
    if (existing) {
      return NextResponse.json({ error: "Employee login already exists." }, { status: 409 });
    }

    const body = await req.json();
    const account = await createEmployeeAccount(supabase, {
      staff_id: staffId,
      company_id: scope.companyId,
      login_email: body.login_email ?? null,
      login_phone: body.login_phone ?? null,
      password: String(body.password ?? ""),
    });

    return NextResponse.json({ account });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { staffId } = await ctx.params;
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const account = await getEmployeeAccountByStaffId(supabase, staffId);
    if (!account || account.company_id !== scope.companyId) {
      return NextResponse.json({ error: "Employee login not found." }, { status: 404 });
    }

    const body = await req.json();
    if (body.password) {
      await updateEmployeeAccountPassword(supabase, account.id, String(body.password));
    }
    if (body.status === "active" || body.status === "inactive") {
      await setEmployeeAccountStatus(supabase, account.id, body.status);
    }

    const updated = await getEmployeeAccountByStaffId(supabase, staffId);
    return NextResponse.json({ account: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

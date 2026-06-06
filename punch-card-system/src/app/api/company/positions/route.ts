import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import {
  createCompanyPosition,
  listCompanyPositions,
} from "@/lib/permissions/company-positions-db";
import {
  ROLE_TEMPLATES,
  SHOP_SCOPES,
  type RoleTemplate,
  type ShopScope,
} from "@/lib/permissions/keys";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const positions = await listCompanyPositions(supabase, scope.companyId);
    return NextResponse.json({ positions });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const based_on_template = String(body.based_on_template ?? "staff") as RoleTemplate;
    const shop_scope = String(body.shop_scope ?? "assigned_only") as ShopScope;

    if (!name) {
      return NextResponse.json({ error: "Position name is required" }, { status: 400 });
    }
    if (!ROLE_TEMPLATES.includes(based_on_template)) {
      return NextResponse.json({ error: "Invalid based_on_template" }, { status: 400 });
    }
    if (!SHOP_SCOPES.includes(shop_scope)) {
      return NextResponse.json({ error: "Invalid shop_scope" }, { status: 400 });
    }

    const default_permissions =
      body.default_permissions && typeof body.default_permissions === "object"
        ? (body.default_permissions as Record<string, boolean>)
        : {};

    const position = await createCompanyPosition(supabase, {
      company_id: scope.companyId,
      name,
      based_on_template,
      shop_scope,
      default_permissions,
    });

    return NextResponse.json({ position });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import {
  deactivateCompanyPosition,
  getCompanyPosition,
  updateCompanyPosition,
} from "@/lib/permissions/company-positions-db";
import {
  ROLE_TEMPLATES,
  SHOP_SCOPES,
  type RoleTemplate,
  type ShopScope,
} from "@/lib/permissions/keys";
import { resolveBasePermissions } from "@/lib/permissions/resolve";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const position = await getCompanyPosition(supabase, id, scope.companyId);
    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 });
    }

    const base_permissions = resolveBasePermissions({
      role_template: position.based_on_template,
      position,
    });

    return NextResponse.json({ position, base_permissions });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const body = (await req.json()) as Record<string, unknown>;
    const patch: Parameters<typeof updateCompanyPosition>[1] = {
      id,
      company_id: scope.companyId,
    };

    if (body.name !== undefined) patch.name = String(body.name);
    if (body.shop_scope !== undefined) {
      const shop_scope = String(body.shop_scope) as ShopScope;
      if (!SHOP_SCOPES.includes(shop_scope)) {
        return NextResponse.json({ error: "Invalid shop_scope" }, { status: 400 });
      }
      patch.shop_scope = shop_scope;
    }
    if (body.based_on_template !== undefined) {
      const based_on_template = String(body.based_on_template) as RoleTemplate;
      if (!ROLE_TEMPLATES.includes(based_on_template)) {
        return NextResponse.json({ error: "Invalid based_on_template" }, { status: 400 });
      }
      patch.based_on_template = based_on_template;
    }
    if (body.default_permissions !== undefined) {
      if (typeof body.default_permissions !== "object" || body.default_permissions === null) {
        return NextResponse.json({ error: "Invalid default_permissions" }, { status: 400 });
      }
      patch.default_permissions = body.default_permissions as Record<string, boolean>;
    }

    const position = await updateCompanyPosition(supabase, patch);
    const base_permissions = resolveBasePermissions({
      role_template: position.based_on_template,
      position,
    });

    return NextResponse.json({ position, base_permissions });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    await deactivateCompanyPosition(supabase, id, scope.companyId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

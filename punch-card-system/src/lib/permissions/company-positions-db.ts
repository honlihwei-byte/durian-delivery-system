import {
  isPermissionKey,
  ROLE_TEMPLATES,
  SHOP_SCOPES,
  type PermissionKey,
  type RoleTemplate,
  type ShopScope,
} from "@/lib/permissions/keys";
import { ROLE_TEMPLATE_DEFAULTS } from "@/lib/permissions/templates";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type CompanyPosition = {
  id: string;
  company_id: string;
  name: string;
  based_on_template: RoleTemplate;
  shop_scope: ShopScope;
  default_permissions: Record<string, boolean>;
  is_system: boolean;
  sort_order: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  staff_count?: number;
};

const SELECT =
  "id, company_id, name, based_on_template, shop_scope, default_permissions, is_system, sort_order, status, created_at, updated_at";

const SYSTEM_POSITIONS: Array<{
  name: string;
  based_on_template: RoleTemplate;
  shop_scope: ShopScope;
  sort_order: number;
}> = [
  { name: "Staff", based_on_template: "staff", shop_scope: "assigned_only", sort_order: 1 },
  { name: "Supervisor", based_on_template: "supervisor", shop_scope: "assigned_only", sort_order: 2 },
  { name: "Store Manager", based_on_template: "store_manager", shop_scope: "assigned_only", sort_order: 3 },
  { name: "Area Manager", based_on_template: "area_manager", shop_scope: "selected_shops", sort_order: 4 },
];

function mapRow(row: Record<string, unknown>): CompanyPosition {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    name: String(row.name),
    based_on_template: String(row.based_on_template) as RoleTemplate,
    shop_scope: String(row.shop_scope) as ShopScope,
    default_permissions: (row.default_permissions as Record<string, boolean> | null) ?? {},
    is_system: row.is_system === true,
    sort_order: Number(row.sort_order ?? 0),
    status: row.status === "inactive" ? "inactive" : "active",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** Ensure four system default positions exist for a company. */
export async function ensureCompanyDefaultPositions(
  supabase: Supabase,
  companyId: string,
): Promise<void> {
  for (const def of SYSTEM_POSITIONS) {
    const { data: existing } = await supabase
      .from("company_positions")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_system", true)
      .eq("based_on_template", def.based_on_template)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("company_positions").insert({
      company_id: companyId,
      name: def.name,
      based_on_template: def.based_on_template,
      shop_scope: def.shop_scope,
      default_permissions: {},
      is_system: true,
      sort_order: def.sort_order,
      status: "active",
    });
    if (error) throw new Error(error.message);
  }
}

export async function listCompanyPositions(
  supabase: Supabase,
  companyId: string,
): Promise<CompanyPosition[]> {
  await ensureCompanyDefaultPositions(supabase, companyId);

  const { data, error } = await supabase
    .from("company_positions")
    .select(SELECT)
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  const positions = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));

  const { data: counts } = await supabase
    .from("staff_permission_profiles")
    .select("position_id")
    .eq("company_id", companyId);
  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const pid = row.position_id != null ? String(row.position_id) : "";
    if (!pid) continue;
    countMap.set(pid, (countMap.get(pid) ?? 0) + 1);
  }

  return positions.map((p) => ({ ...p, staff_count: countMap.get(p.id) ?? 0 }));
}

export async function getCompanyPosition(
  supabase: Supabase,
  positionId: string,
  companyId: string,
): Promise<CompanyPosition | null> {
  const { data, error } = await supabase
    .from("company_positions")
    .select(SELECT)
    .eq("id", positionId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getDefaultPositionForTemplate(
  supabase: Supabase,
  companyId: string,
  template: RoleTemplate,
): Promise<CompanyPosition | null> {
  await ensureCompanyDefaultPositions(supabase, companyId);
  const { data, error } = await supabase
    .from("company_positions")
    .select(SELECT)
    .eq("company_id", companyId)
    .eq("is_system", true)
    .eq("based_on_template", template)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function createCompanyPosition(
  supabase: Supabase,
  params: {
    company_id: string;
    name: string;
    based_on_template: RoleTemplate;
    shop_scope: ShopScope;
    default_permissions?: Record<string, boolean>;
  },
): Promise<CompanyPosition> {
  const name = params.name.trim();
  if (!name) throw new Error("Position name is required.");
  if (!ROLE_TEMPLATES.includes(params.based_on_template)) {
    throw new Error("Invalid based_on_template");
  }
  if (!SHOP_SCOPES.includes(params.shop_scope)) {
    throw new Error("Invalid shop_scope");
  }

  const perms = sanitizePermissions(params.default_permissions ?? {});

  const { data, error } = await supabase
    .from("company_positions")
    .insert({
      company_id: params.company_id,
      name,
      based_on_template: params.based_on_template,
      shop_scope: params.shop_scope,
      default_permissions: perms,
      is_system: false,
      sort_order: 50,
      status: "active",
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function updateCompanyPosition(
  supabase: Supabase,
  params: {
    id: string;
    company_id: string;
    name?: string;
    shop_scope?: ShopScope;
    default_permissions?: Record<string, boolean>;
    based_on_template?: RoleTemplate;
  },
): Promise<CompanyPosition> {
  const existing = await getCompanyPosition(supabase, params.id, params.company_id);
  if (!existing) throw new Error("Position not found");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (params.name !== undefined) {
    const name = params.name.trim();
    if (!name) throw new Error("Position name is required.");
    patch.name = name;
  }
  if (params.shop_scope !== undefined) {
    if (!SHOP_SCOPES.includes(params.shop_scope)) throw new Error("Invalid shop_scope");
    patch.shop_scope = params.shop_scope;
  }
  if (params.default_permissions !== undefined) {
    patch.default_permissions = sanitizePermissions(params.default_permissions);
  }
  if (params.based_on_template !== undefined && !existing.is_system) {
    if (!ROLE_TEMPLATES.includes(params.based_on_template)) {
      throw new Error("Invalid based_on_template");
    }
    patch.based_on_template = params.based_on_template;
  }

  const { data, error } = await supabase
    .from("company_positions")
    .update(patch)
    .eq("id", params.id)
    .eq("company_id", params.company_id)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function deactivateCompanyPosition(
  supabase: Supabase,
  positionId: string,
  companyId: string,
): Promise<void> {
  const existing = await getCompanyPosition(supabase, positionId, companyId);
  if (!existing) throw new Error("Position not found");
  if (existing.is_system) throw new Error("System default positions cannot be deleted.");

  const { count } = await supabase
    .from("staff_permission_profiles")
    .select("id", { count: "exact", head: true })
    .eq("position_id", positionId);
  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete a position that is assigned to employees.");
  }

  const { error } = await supabase
    .from("company_positions")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", positionId)
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);
}

export function sanitizePermissions(raw: Record<string, boolean>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (isPermissionKey(k)) out[k] = v === true;
  }
  return out;
}

export function applyTemplateToPositionPermissions(
  template: RoleTemplate,
): Record<string, boolean> {
  return { ...ROLE_TEMPLATE_DEFAULTS[template].permissions };
}

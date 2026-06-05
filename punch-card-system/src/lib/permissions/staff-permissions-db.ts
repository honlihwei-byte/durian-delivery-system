import {
  ROLE_TEMPLATES,
  SHOP_SCOPES,
  type PermissionKey,
  type RoleTemplate,
  type ShopScope,
} from "@/lib/permissions/keys";
import { ROLE_TEMPLATE_DEFAULTS } from "@/lib/permissions/templates";
import { listActiveStaffForShop } from "@/lib/staff";
import {
  canAccessShop,
  canVerifyTasks,
  hasPermission,
  type StaffPermissionProfile,
} from "@/lib/permissions/resolve";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

const PROFILE_SELECT =
  "id, company_id, staff_id, role_template, shop_scope, permission_overrides, created_at, updated_at";

export async function getStaffAssignedShopIds(
  supabase: Supabase,
  staffId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff_shop_assignments")
    .select("shop_id")
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.shop_id));
}

export async function getStaffPermissionScopeShopIds(
  supabase: Supabase,
  staffId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff_permission_shops")
    .select("shop_id")
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.shop_id));
}

export async function loadStaffPermissionProfile(
  supabase: Supabase,
  staffId: string,
): Promise<StaffPermissionProfile | null> {
  const { data, error } = await supabase
    .from("staff_permission_profiles")
    .select(PROFILE_SELECT)
    .eq("staff_id", staffId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const [scope_shop_ids, assigned_shop_ids] = await Promise.all([
    getStaffPermissionScopeShopIds(supabase, staffId),
    getStaffAssignedShopIds(supabase, staffId),
  ]);

  return {
    staff_id: String(data.staff_id),
    company_id: String(data.company_id),
    role_template: String(data.role_template) as RoleTemplate,
    shop_scope: String(data.shop_scope) as ShopScope,
    permission_overrides:
      (data.permission_overrides as Record<string, boolean> | null) ?? {},
    scope_shop_ids,
    assigned_shop_ids,
  };
}

/** Ensure profile exists; create default staff template if missing. */
export async function ensureStaffPermissionProfile(
  supabase: Supabase,
  params: { company_id: string; staff_id: string },
): Promise<StaffPermissionProfile> {
  const existing = await loadStaffPermissionProfile(supabase, params.staff_id);
  if (existing) return existing;

  const { error } = await supabase.from("staff_permission_profiles").insert({
    company_id: params.company_id,
    staff_id: params.staff_id,
    role_template: "staff",
    shop_scope: "assigned_only",
    permission_overrides: {},
  });
  if (error) throw new Error(error.message);
  const created = await loadStaffPermissionProfile(supabase, params.staff_id);
  if (!created) throw new Error("Could not create permission profile");
  return created;
}

export async function saveStaffPermissionProfile(
  supabase: Supabase,
  params: {
    company_id: string;
    staff_id: string;
    role_template: RoleTemplate;
    shop_scope: ShopScope;
    permission_overrides: Record<string, boolean>;
    scope_shop_ids: string[];
  },
): Promise<StaffPermissionProfile> {
  if (!ROLE_TEMPLATES.includes(params.role_template)) {
    throw new Error("Invalid role_template");
  }
  if (!SHOP_SCOPES.includes(params.shop_scope)) {
    throw new Error("Invalid shop_scope");
  }

  await ensureStaffPermissionProfile(supabase, {
    company_id: params.company_id,
    staff_id: params.staff_id,
  });

  const { error } = await supabase
    .from("staff_permission_profiles")
    .update({
      role_template: params.role_template,
      shop_scope: params.shop_scope,
      permission_overrides: params.permission_overrides,
      updated_at: new Date().toISOString(),
    })
    .eq("staff_id", params.staff_id)
    .eq("company_id", params.company_id);
  if (error) throw new Error(error.message);

  await supabase.from("staff_permission_shops").delete().eq("staff_id", params.staff_id);
  if (params.shop_scope === "selected_shops" && params.scope_shop_ids.length > 0) {
    const { error: shopErr } = await supabase.from("staff_permission_shops").insert(
      params.scope_shop_ids.map((shop_id) => ({
        staff_id: params.staff_id,
        shop_id,
      })),
    );
    if (shopErr) throw new Error(shopErr.message);
  }

  const profile = await loadStaffPermissionProfile(supabase, params.staff_id);
  if (!profile) throw new Error("Profile not found after save");
  return profile;
}

export function applyRoleTemplateToOverrides(
  template: RoleTemplate,
): Record<string, boolean> {
  return { ...ROLE_TEMPLATE_DEFAULTS[template].permissions };
}

export type EligibleStaffRow = {
  id: string;
  staff_name: string;
  staff_code: string;
  role_template: RoleTemplate;
  other_shop?: boolean;
};

export async function listActiveStaffForCompany(
  supabase: Supabase,
  companyId: string,
): Promise<Array<{ id: string; staff_name: string; staff_code: string; status: string }>> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, staff_name, staff_code, status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("staff_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    staff_name: String(r.staff_name),
    staff_code: String(r.staff_code),
    status: String(r.status),
  }));
}

export async function listEligibleVerifiers(
  supabase: Supabase,
  params: { company_id: string; shop_id: string },
): Promise<EligibleStaffRow[]> {
  const staff = await listActiveStaffForCompany(supabase, params.company_id);
  const out: EligibleStaffRow[] = [];

  for (const s of staff) {
    const profile = await ensureStaffPermissionProfile(supabase, {
      company_id: params.company_id,
      staff_id: s.id,
    });
    if (!canAccessShop(profile, params.shop_id) || !canVerifyTasks(profile)) continue;
    out.push({
      id: s.id,
      staff_name: s.staff_name,
      staff_code: s.staff_code,
      role_template: profile.role_template,
    });
  }
  return out;
}

async function addEligibleRow(
  supabase: Supabase,
  out: EligibleStaffRow[],
  seen: Set<string>,
  params: { company_id: string; shop_id: string },
  staff: { id: string; staff_name: string; staff_code: string },
  other_shop: boolean,
): Promise<void> {
  if (seen.has(staff.id)) return;
  seen.add(staff.id);
  const profile = await ensureStaffPermissionProfile(supabase, {
    company_id: params.company_id,
    staff_id: staff.id,
  });
  if (!canAccessShop(profile, params.shop_id)) return;
  out.push({
    id: staff.id,
    staff_name: staff.staff_name,
    staff_code: staff.staff_code,
    role_template: profile.role_template,
    other_shop,
  });
}

export async function listEligibleAssignees(
  supabase: Supabase,
  params: {
    company_id: string;
    shop_id: string;
    task_date?: string;
    include_cross_shop?: boolean;
  },
): Promise<EligibleStaffRow[]> {
  const seen = new Set<string>();
  const out: EligibleStaffRow[] = [];

  const shopStaff = await listActiveStaffForShop(supabase, params.shop_id);
  for (const s of shopStaff) {
    await addEligibleRow(supabase, out, seen, params, s, false);
  }

  if (params.task_date) {
    const { data: scheduled, error } = await supabase
      .from("staff_schedules")
      .select("staff_id")
      .eq("shop_id", params.shop_id)
      .eq("shift_date", params.task_date)
      .eq("status", "active");
    if (error) throw new Error(error.message);

    const schedIds = [...new Set((scheduled ?? []).map((r) => String(r.staff_id)))];
    if (schedIds.length > 0) {
      const { data: staffRows } = await supabase
        .from("staff")
        .select("id, staff_name, staff_code")
        .in("id", schedIds)
        .eq("company_id", params.company_id)
        .eq("status", "active");
      for (const s of staffRows ?? []) {
        await addEligibleRow(
          supabase,
          out,
          seen,
          params,
          {
            id: String(s.id),
            staff_name: String(s.staff_name),
            staff_code: String(s.staff_code),
          },
          false,
        );
      }
    }
  }

  if (params.include_cross_shop) {
    const allStaff = await listActiveStaffForCompany(supabase, params.company_id);
    const assignedIds = new Set(shopStaff.map((s) => s.id));
    for (const s of allStaff) {
      if (assignedIds.has(s.id)) continue;
      const profile = await ensureStaffPermissionProfile(supabase, {
        company_id: params.company_id,
        staff_id: s.id,
      });
      if (!canAccessShop(profile, params.shop_id)) continue;
      if (
        !hasPermission(profile, "tasks.view_shop") &&
        !hasPermission(profile, "tasks.submit_proof")
      ) {
        continue;
      }
      await addEligibleRow(supabase, out, seen, params, s, true);
    }
  }

  out.sort((a, b) => a.staff_name.localeCompare(b.staff_name));
  return out;
}
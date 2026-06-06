import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
  type RoleTemplate,
  type ShopScope,
} from "@/lib/permissions/keys";
import { ROLE_TEMPLATE_DEFAULTS } from "@/lib/permissions/templates";
import type { CompanyPosition } from "@/lib/permissions/company-positions-db";

export type StaffPermissionProfile = {
  staff_id: string;
  company_id: string;
  role_template: RoleTemplate;
  shop_scope: ShopScope;
  permission_overrides: Record<string, boolean>;
  scope_shop_ids: string[];
  assigned_shop_ids: string[];
  position_id: string | null;
  position: CompanyPosition | null;
};

/** Base permissions from role template + optional position defaults. */
export function resolveBasePermissions(
  profile: Pick<StaffPermissionProfile, "role_template" | "position">,
): Partial<Record<PermissionKey, boolean>> {
  const templateKey = profile.position?.based_on_template ?? profile.role_template;
  const template = ROLE_TEMPLATE_DEFAULTS[templateKey];
  const merged = { ...template.permissions } as Partial<Record<PermissionKey, boolean>>;

  if (profile.position?.default_permissions) {
    for (const [key, value] of Object.entries(profile.position.default_permissions)) {
      if (key in merged || (ALL_PERMISSION_KEYS as readonly string[]).includes(key)) {
        merged[key as PermissionKey] = value === true;
      }
    }
  }

  return merged;
}

/**
 * Final employee permissions =
 * position base (template + position defaults) + individual overrides.
 */
export function resolveEffectivePermissions(
  profile: Pick<
    StaffPermissionProfile,
    "role_template" | "permission_overrides" | "position"
  >,
): Record<PermissionKey, boolean> {
  const base = resolveBasePermissions(profile);
  const out = {} as Record<PermissionKey, boolean>;

  for (const key of ALL_PERMISSION_KEYS) {
    if (key in profile.permission_overrides) {
      out[key] = profile.permission_overrides[key] === true;
    } else if (key in base) {
      out[key] = base[key as PermissionKey] === true;
    } else {
      out[key] = false;
    }
  }
  return out;
}

export function hasPermission(
  profile: StaffPermissionProfile,
  key: PermissionKey,
): boolean {
  return resolveEffectivePermissions(profile)[key] === true;
}

/** Shops this employee may access for ops data. */
export function accessibleShopIds(profile: StaffPermissionProfile): string[] | "all" {
  if (profile.shop_scope === "all_shops") return "all";
  if (profile.shop_scope === "selected_shops") return profile.scope_shop_ids;
  return profile.assigned_shop_ids;
}

export function canAccessShop(profile: StaffPermissionProfile, shopId: string): boolean {
  const scope = accessibleShopIds(profile);
  if (scope === "all") return true;
  return scope.includes(shopId);
}

export function canVerifyTasks(profile: StaffPermissionProfile): boolean {
  return (
    hasPermission(profile, "tasks.verify_proof") || hasPermission(profile, "tasks.approve")
  );
}

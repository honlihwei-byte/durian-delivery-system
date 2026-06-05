import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
  type RoleTemplate,
  type ShopScope,
} from "@/lib/permissions/keys";
import { ROLE_TEMPLATE_DEFAULTS } from "@/lib/permissions/templates";

export type StaffPermissionProfile = {
  staff_id: string;
  company_id: string;
  role_template: RoleTemplate;
  shop_scope: ShopScope;
  permission_overrides: Record<string, boolean>;
  scope_shop_ids: string[];
  assigned_shop_ids: string[];
};

/** Merge template defaults with per-employee overrides. */
export function resolveEffectivePermissions(
  profile: Pick<StaffPermissionProfile, "role_template" | "permission_overrides">,
): Record<PermissionKey, boolean> {
  const template = ROLE_TEMPLATE_DEFAULTS[profile.role_template];
  const out = {} as Record<PermissionKey, boolean>;

  for (const key of ALL_PERMISSION_KEYS) {
    if (key in profile.permission_overrides) {
      out[key] = profile.permission_overrides[key] === true;
    } else if (key in template.permissions) {
      out[key] = template.permissions[key as PermissionKey] === true;
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
  const effective = resolveEffectivePermissions(profile);
  return effective[key] === true;
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

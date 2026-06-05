import { canAccessShop, canVerifyTasks, type StaffPermissionProfile } from "@/lib/permissions/resolve";
import { VERIFIER_ROLE_TEMPLATES } from "@/lib/permissions/ui-config";
import type { RoleTemplate } from "@/lib/permissions/keys";

export function isEligibleTaskVerifier(
  profile: StaffPermissionProfile,
  shopId: string,
): boolean {
  if (!canAccessShop(profile, shopId)) return false;

  if (VERIFIER_ROLE_TEMPLATES.includes(profile.role_template as RoleTemplate)) {
    return true;
  }

  return canVerifyTasks(profile);
}

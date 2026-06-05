import { loadShopForPunch } from "@/lib/attendance-punch";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffTasksScreen } from "@/components/shop/StaffTasksScreen";
import { listActiveStaffForShop } from "@/lib/staff";

export async function StaffTasksPage({ shopId }: { shopId: string }) {
  const supabase = createAdminClient();
  const shopResult = await loadShopForPunch(supabase, shopId);
  if ("error" in shopResult) {
    return <p className="p-4 text-sm text-red-600">{shopResult.error}</p>;
  }

  const staff = await listActiveStaffForShop(supabase, shopId);

  return (
    <StaffTasksScreen
      shopId={shopId}
      shopStaff={staff.map((s) => ({
        id: s.id,
        staff_name: s.staff_name,
        staff_code: s.staff_code,
      }))}
    />
  );
}

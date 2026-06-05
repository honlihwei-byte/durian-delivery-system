import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export async function notifyStaffTask(
  supabase: Supabase,
  params: {
    company_id: string;
    staff_id: string;
    shop_id: string;
    notification_type: string;
    title: string;
    body: string;
  },
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    company_id: params.company_id,
    staff_id: params.staff_id,
    shop_id: params.shop_id,
    notification_type: params.notification_type,
    title: params.title,
    body: params.body,
  });
  if (error) console.warn("[task-notification] insert failed", error.message);
}

/**
 * Future: WhatsApp Business API can call the same event hooks here.
 * Architecture: task lifecycle events → notifications table → delivery workers (email / WhatsApp).
 */

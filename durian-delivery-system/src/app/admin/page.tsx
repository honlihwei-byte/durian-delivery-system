import { AdminPageClient } from "@/components/AdminPageClient";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminPage() {
  const initialAuthenticated = await isAdminAuthenticated();

  return <AdminPageClient initialAuthenticated={initialAuthenticated} />;
}

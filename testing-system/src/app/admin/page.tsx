import Link from "next/link";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { SiteHeader } from "@/components/SiteHeader";
import { getAdminOrders } from "@/lib/queries";
import { AdminOrdersTable } from "./AdminOrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const rows = await getAdminOrders();

  return (
    <div className="min-h-screen">
      <SiteHeader
        title="Testing System"
        subtitle="Admin · Orders"
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/shop"
              className="rounded-lg border border-drive-line px-3 py-2 text-sm font-medium text-drive-ink hover:bg-drive-bg"
            >
              View shop
            </Link>
            <AdminLogoutButton />
          </div>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AdminOrdersTable rows={rows} />
      </main>
    </div>
  );
}

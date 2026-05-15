import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-drive-bg">
      <AdminDashboardClient />
    </div>
  );
}

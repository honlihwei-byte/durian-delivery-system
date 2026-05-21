import { AdminPinGate } from "@/components/admin/AdminPinGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPinGate>{children}</AdminPinGate>;
}

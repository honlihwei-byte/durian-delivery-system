import { AdminPinGate } from "@/components/admin/AdminPinGate";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <AdminPinGate>{children}</AdminPinGate>;
}

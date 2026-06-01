import { redirect } from "next/navigation";

export default function StaffHistoryPage() {
  redirect("/admin?report=month");
}

import { redirect } from "next/navigation";

export default function LateEarlyPage() {
  redirect("/admin?report=month");
}

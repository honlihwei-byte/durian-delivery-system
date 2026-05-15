import { redirect } from "next/navigation";

export default function AdminLoginPage() {
  redirect("/login?role=admin&next=/admin");
}

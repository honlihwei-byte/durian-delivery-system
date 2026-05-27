import { redirect } from "next/navigation";

/** Legacy route — scheduling is now inside each shop. */
export default function ShiftScheduleRedirectPage() {
  redirect("/admin/shops");
}

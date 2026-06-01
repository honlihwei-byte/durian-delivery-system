import { Suspense } from "react";
import { AdminAttendancePage } from "./AdminAttendancePage";

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-12 text-center text-sm text-zinc-500">Loading attendance…</p>
      }
    >
      <AdminAttendancePage />
    </Suspense>
  );
}

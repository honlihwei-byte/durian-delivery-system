import { Suspense } from "react";
import { EmployeeActivateForm } from "@/components/employee/EmployeeActivateForm";

export default function EmployeeActivatePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <EmployeeActivateForm />
      </Suspense>
    </div>
  );
}

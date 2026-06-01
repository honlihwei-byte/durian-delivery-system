import Link from "next/link";
import { PayrollReportPanel } from "@/components/admin/report/PayrollReportPanel";

export default function PayrollHoursReportPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin/reports" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Reports
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Payroll Report</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Compare scheduled hours, actual punch hours, and payroll hours per employee.
        </p>
      </header>
      <PayrollReportPanel />
    </div>
  );
}

import Link from "next/link";
import { AdminHubLinks } from "@/components/admin/AdminHubLinks";

const LINKS = [
  {
    href: "/admin/reports/attendance-summary",
    title: "Attendance Summary",
    description: "Day, week, and month attendance with filters and CSV export.",
  },
  {
    href: "/admin/reports/payroll-hours",
    title: "Payroll Hours",
    description: "Actual vs scheduled payroll hours by employee for any date range.",
  },
  {
    href: "/admin/reports/late-early",
    title: "Late & Early Analysis",
    description: "Late arrivals, early arrivals, and late clock-outs (KPI only).",
  },
  {
    href: "/admin/reports/staff-history",
    title: "Staff Attendance History",
    description: "Monthly punch history and shift performance per employee.",
  },
];

export default function ReportsHubPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Payroll and attendance reporting. Security reviews are under Security Center.
        </p>
      </header>
      <AdminHubLinks links={LINKS} />
    </div>
  );
}

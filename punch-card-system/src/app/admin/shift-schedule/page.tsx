import Link from "next/link";
import { PageGuide } from "@/components/help/PageGuide";

export default function ShiftScheduleHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <Link href="/admin" className="text-sm font-medium text-blue-600 underline dark:text-blue-400">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shift Schedule</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Scheduling is configured inside each shop.
        </p>
      </header>
      <PageGuide pageId="shift-schedule" />
      <Link
        href="/admin/shops"
        className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Open Shops to schedule
      </Link>
    </div>
  );
}

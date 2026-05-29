import Link from "next/link";
import { PAGE_GUIDES, type HelpPageId } from "@/lib/help/page-guides";

const PAGE_LINKS: { id: HelpPageId; href: string }[] = [
  { id: "dashboard", href: "/admin" },
  { id: "attendance", href: "/admin" },
  { id: "reports", href: "/admin" },
  { id: "shops", href: "/admin/shops" },
  { id: "staff", href: "/admin/staff" },
  { id: "shift-schedule", href: "/admin/shift-schedule" },
  { id: "subscription", href: "/billing" },
  { id: "company-profile", href: "/admin/profile" },
];

export default function HelpCenterPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Help Center</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Learn how to use LW OpsFlow without contacting support. Start with the quick start guide,
          then open page-specific guides from each admin screen.
        </p>
      </header>

      <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
        <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100">Quick Start</h2>
        <p className="mt-1 text-sm text-blue-900/90 dark:text-blue-100/90">
          Step-by-step setup from first shop through first attendance record.
        </p>
        <Link
          href="/help/getting-started"
          className="mt-3 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Open Quick Start Guide
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Page guides</h2>
        <ul className="mt-3 space-y-3">
          {PAGE_LINKS.map(({ id, href }) => {
            const g = PAGE_GUIDES[id];
            return (
              <li
                key={id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{g.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{g.what}</p>
                  </div>
                  <Link
                    href={href}
                    className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold dark:border-zinc-600"
                  >
                    Open page
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

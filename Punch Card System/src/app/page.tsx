import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Punch Card System",
  description: "Multi-shop staff clock in and out with GPS verification.",
};

export default function Home() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Staff attendance</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Punch Card System
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Manage shop locations, assign staff, and review attendance with GPS-verified clock in and out.
        </p>
      </div>

      <nav className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/admin/shops"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Admin Shops
        </Link>
        <Link
          href="/attendance"
          className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Attendance
        </Link>
      </nav>

      <p className="mt-10 max-w-sm text-center text-xs text-zinc-500">
        Staff clock in at each shop&apos;s QR page. This portal is for managers and admins.
      </p>
    </main>
  );
}

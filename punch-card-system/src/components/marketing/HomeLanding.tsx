import Link from "next/link";
import { btnPrimary, btnSecondary } from "./MarketingShell";

const STEPS = [
  "Register your company",
  "Create shops & GPS zones",
  "Add staff",
  "Print shop QR codes",
  "Staff clock in / out",
];

const FEATURES = [
  "GPS verification",
  "QR clock in",
  "Indoor mode",
  "Photo proof fallback",
  "Attendance reports",
  "Forgot punch requests",
  "Multi-shop support",
];

export function HomeLanding() {
  return (
    <>
      <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
          Staff attendance
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Punch Card System
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
          GPS + QR staff attendance for shops and businesses. Verify location, manage multiple
          shops, and review hours in one place.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href="/register" className={btnPrimary("w-full sm:w-auto")}>
            Start Free Trial
          </Link>
          <Link href="/login" className={btnSecondary("w-full sm:w-auto")}>
            Company Login
          </Link>
          <Link href="/clock" className={btnSecondary("w-full sm:w-auto")}>
            Staff Clock In
          </Link>
        </div>
        <p className="mt-6 text-xs text-zinc-500">14-day free trial · No credit card required</p>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">How it works</h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Features</h2>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Pricing</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-300/60 bg-white px-6 py-5 dark:border-emerald-800 dark:bg-zinc-950">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Free trial</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">14 days</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Full features for new companies</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5 dark:border-zinc-700 dark:bg-zinc-950">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Starter</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              RM29<span className="text-base font-medium text-zinc-500">/month</span>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">After trial · per company</p>
          </div>
        </div>
        <Link href="/register" className={`${btnPrimary("mt-8")} px-8`}>
          Start Free Trial
        </Link>
      </section>
    </>
  );
}

import Link from "next/link";
import { IconChart, IconMapPin, IconRadar, IconRoute } from "@/components/landing/LandingIcons";

const cardShadow =
  "shadow-[0_1px_2px_rgba(26,31,28,0.04),0_12px_32px_-8px_rgba(26,31,28,0.12)]";

function LogoMark() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-drive-accent text-sm font-semibold text-white"
      aria-hidden
    >
      DO
    </div>
  );
}

function HeroPreviewCard() {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-drive-line/90 bg-drive-surface ${cardShadow}`}
    >
      <div className="flex items-center gap-2 border-b border-drive-line/80 bg-drive-bg/80 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-drive-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-drive-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-drive-line" />
        </div>
        <p className="ml-2 text-xs font-medium text-drive-muted">Operations overview</p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Active", value: "4", tone: "text-drive-ink" },
              { label: "On route", value: "3", tone: "text-drive-ink" },
              { label: "Exceptions", value: "2", tone: "text-drive-warn" },
            ].map((k) => (
            <div key={k.label} className="rounded-xl border border-drive-line/70 bg-drive-bg/50 px-2 py-2.5 sm:px-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-drive-muted">{k.label}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums sm:text-xl ${k.tone}`}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-drive-line/70 bg-drive-bg/40 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-drive-muted">
            <span>Route completion</span>
            <span className="font-medium text-drive-ink">78%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-drive-line/60">
            <div className="h-full w-[78%] rounded-full bg-drive-accent/85" />
          </div>
          <div className="mt-3 flex items-end justify-between gap-1">
            {[40, 65, 52, 78, 70, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-drive-accent/25"
                style={{ height: `${Math.max(16, h * 0.45)}px` }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-drive-line/70 bg-drive-surface px-3 py-2.5">
          <div className="h-8 w-8 shrink-0 rounded-full bg-drive-line/80" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-drive-ink">Perak Frozen Route · TF Tambun leg</p>
            <p className="truncate text-[11px] text-drive-muted">Last GPS ping 1 min ago · Cold chain OK</p>
          </div>
          <span className="shrink-0 rounded-md bg-drive-bg px-2 py-1 text-[10px] font-medium text-drive-muted">
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Driver Tracking",
    description: "Live status, ETAs, and check-ins so dispatch always knows where crews are.",
    icon: IconMapPin,
  },
  {
    title: "Route Assignment",
    description: "Plan and push routes to the field with clear stops and handoff accountability.",
    icon: IconRoute,
  },
  {
    title: "Delivery Analytics",
    description: "Throughput, completion rates, and trends to tune capacity and service levels.",
    icon: IconChart,
  },
  {
    title: "Real-time Operations Visibility",
    description: "One operational picture across drivers, routes, and exceptions as they happen.",
    icon: IconRadar,
  },
] as const;

const kpiPreview = [
  { label: "Active Drivers", value: "24", hint: "Across 6 districts", accent: false },
  { label: "Routes Completed", value: "186", hint: "Last 7 days", accent: false },
  { label: "Delivery Exceptions", value: "3", hint: "Requires follow-up", accent: true },
  { label: "Average Delivery Time", value: "32 min", hint: "Rolling 14-day", accent: false },
] as const;

export function HomeLandingView() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-drive-bg via-drive-bg to-[#eef1ee] text-drive-ink">
      <header className="sticky top-0 z-40 border-b border-drive-line/80 bg-drive-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg outline-none ring-offset-2 ring-offset-drive-surface focus-visible:ring-2 focus-visible:ring-drive-accent"
          >
            <LogoMark />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-drive-ink sm:text-base">Delivery Operations</p>
              <p className="text-xs text-drive-muted">Management platform</p>
            </div>
          </Link>
          <nav className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3" aria-label="Primary">
            <Link
              href="/login?role=driver"
              className="inline-flex items-center justify-center rounded-lg border border-drive-line bg-drive-surface px-4 py-2.5 text-sm font-semibold text-drive-ink shadow-sm transition hover:bg-drive-bg sm:min-w-[8.5rem]"
            >
              Driver Login
            </Link>
            <Link
              href="/login?role=admin"
              className="inline-flex items-center justify-center rounded-lg bg-drive-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-drive-accentMuted sm:min-w-[8.5rem]"
            >
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20" aria-labelledby="hero-heading">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="max-w-xl lg:max-w-none">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-drive-muted">Logistics operations</p>
              <h1
                id="hero-heading"
                className="mt-4 text-balance text-3xl font-semibold tracking-tight text-drive-ink sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]"
              >
                Delivery Operations Management Platform
              </h1>
              <p className="mt-4 text-pretty text-base leading-relaxed text-drive-muted sm:text-lg">
                Manage drivers, routes, deliveries, and field operations in one centralized system.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-drive-accent/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-drive-accent">
                  Guided browser demo
                </span>
                <span className="text-xs text-drive-muted">No signup · local data only</span>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Sample tenants in demo data">
                {["MX Fruit", "ABC Frozen", "Mini Mart Supplier"].map((name) => (
                  <li
                    key={name}
                    className="rounded-lg border border-drive-line/90 bg-drive-surface px-3 py-1.5 text-xs font-medium text-drive-ink shadow-sm"
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login?role=driver"
                  className="inline-flex items-center justify-center rounded-xl bg-drive-accent px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-drive-accentMuted"
                >
                  Driver Login
                </Link>
                <Link
                  href="/login?role=admin"
                  className="inline-flex items-center justify-center rounded-xl border border-drive-line bg-drive-surface px-6 py-3.5 text-sm font-semibold text-drive-ink shadow-sm transition hover:bg-drive-bg"
                >
                  Admin Login
                </Link>
              </div>
              <p className="mt-6 text-xs leading-relaxed text-drive-muted sm:text-sm">
                Browser-only pilot: operations <span className="font-mono text-drive-ink/90">admin / admin</span> per
                company. Drivers Kumar, Mei Ling, Ah Chong, and Ravi use{" "}
                <span className="font-mono text-drive-ink/90">demo123</span> — see login page for codes MXFRUIT,
                ABCFROZEN, MINIMART.
              </p>
            </div>
            <div className="lg:pl-4">
              <HeroPreviewCard />
            </div>
          </div>
        </section>

        <section className="border-y border-drive-line/60 bg-drive-surface/60 py-16 sm:py-20" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="features-heading" className="text-2xl font-semibold tracking-tight text-drive-ink sm:text-3xl">
                Built for delivery operations teams
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-drive-muted sm:text-base">
                Everything you need to coordinate the field and the control room—without noise or clutter.
              </p>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ title, description, icon: Icon }) => (
                <li
                  key={title}
                  className={`flex flex-col rounded-2xl border border-drive-line/90 bg-drive-surface p-6 ${cardShadow} transition-shadow duration-300 hover:shadow-[0_2px_8px_rgba(26,31,28,0.06),0_16px_40px_-10px_rgba(26,31,28,0.14)]`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-drive-bg text-drive-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-drive-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-drive-muted">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="metrics-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="metrics-heading" className="text-2xl font-semibold tracking-tight text-drive-ink sm:text-3xl">
                Operations at a glance
              </h2>
              <p className="mt-2 max-w-xl text-sm text-drive-muted sm:text-base">
                Illustrative dashboard metrics—your live data appears once connected to your environment.
              </p>
            </div>
          </div>
          <div className="mt-10 rounded-2xl border border-drive-line/90 bg-drive-surface p-5 sm:p-8 lg:p-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-drive-line/80 pb-6">
              <div>
                <p className="text-sm font-semibold text-drive-ink">Executive summary</p>
                <p className="text-xs text-drive-muted">Today · All regions</p>
              </div>
              <span className="rounded-lg bg-drive-bg px-3 py-1 text-xs font-medium text-drive-muted">Preview</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpiPreview.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-drive-line/80 bg-drive-bg/40 px-4 py-5 sm:px-5"
                >
                  <p className="text-xs font-medium leading-snug text-drive-muted">{kpi.label}</p>
                  <p
                    className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${
                      kpi.accent ? "text-drive-warn" : "text-drive-ink"
                    }`}
                  >
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-drive-muted">{kpi.hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-drive-line/80 bg-drive-bg/30 p-4 lg:col-span-2">
                <p className="text-xs font-medium text-drive-muted">Volume trend</p>
                <div className="mt-4 flex h-28 items-end justify-between gap-1.5 sm:h-32">
                  {[35, 48, 42, 55, 50, 62, 58, 70, 66, 74, 72, 80].map((pct, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-sm bg-drive-accent/20"
                          style={{ height: `${Math.max(18, pct * 0.9)}px` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-drive-line/80 bg-drive-bg/30 p-4">
                <p className="text-xs font-medium text-drive-muted">SLA window</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums text-drive-ink">94%</p>
                <p className="mt-1 text-xs text-drive-muted">On-time within committed window</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-drive-line/70">
                  <div className="h-full w-[94%] rounded-full bg-drive-accent/80" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-drive-line/80 bg-drive-surface/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-center text-xs text-drive-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p>© {new Date().getFullYear()} Delivery Operations. All rights reserved.</p>
          <p className="sm:text-right">
            <Link href="/login?role=admin" className="font-medium text-drive-accent underline-offset-4 hover:underline">
              Admin console
            </Link>
            <span className="mx-2 text-drive-line">·</span>
            <Link href="/login?role=driver" className="font-medium text-drive-accent underline-offset-4 hover:underline">
              Driver app
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

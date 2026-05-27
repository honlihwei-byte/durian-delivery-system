import Link from "next/link";
import { ALL_PLAN_FEATURES, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { DashboardPreview } from "./DashboardPreview";
import { btnPrimary, btnSecondary } from "./MarketingShell";

const STEPS = [
  {
    n: 1,
    title: "Register company",
    desc: "Create your company account and start the 14-day free trial.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Create shops & GPS zones",
    desc: "Set up each location with GPS verification and clock QR codes.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Add staff",
    desc: "Assign employees to shops and enable punch authorization.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    n: 4,
    title: "Assign schedules",
    desc: "Use fixed shop hours or shift templates per staff.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    n: 5,
    title: "Staff clock in/out",
    desc: "Staff scan QR, verify GPS, and punch from their phone.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const WHY_CARDS = [
  {
    title: "Indoor & High-rise Ready",
    desc:
      "GPS can become weak inside shopping malls, offices and high-rise buildings. OpsFlow supports multiple verification options so staff can still clock in reliably.",
    bullets: [
      "Indoor confidence mode",
      "GPS fallback",
      "Multiple GPS points",
      "Photo proof option",
    ],
    examples: ["Main Entrance", "Office Floor", "Parking Area"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: "Smart Shop Scheduling",
    desc:
      "Manage fixed working hours or flexible shifts by shop, without staff self-scheduling.",
    bullets: [
      "Fixed schedule mode",
      "Shift based mode",
      "Weekly scheduling",
      "Shift templates",
      "Copy previous week",
    ],
    examples: ["Morning: 10:00–18:00", "Noon: 12:30–21:00", "Part Time: 11:00–14:00"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Attendance Tracking",
    desc:
      "Automatically compare scheduled work time and actual attendance so managers don’t need manual calculations.",
    bullets: [
      "Late arrival",
      "Early leave",
      "Missing punch",
      "Overtime",
      "Attendance summary",
    ],
    examples: [],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Multi-shop Management",
    desc:
      "Manage multiple branches from one dashboard with shop-level setup for GPS and schedules.",
    bullets: [
      "Multiple shops",
      "Different GPS zones",
      "Different schedules",
      "Shop level setup",
    ],
    examples: [],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
] as const;

const PRICING_HIGHLIGHTS = [
  "No locked features",
  "QR + GPS attendance",
  "Indoor / high-rise support",
  "Shift scheduling",
  "Attendance performance tracking",
  "Multi-shop management",
] as const;

const SPECIAL_CARDS = [
  {
    title: "Built using real operations experience",
    desc:
      "Designed from real retail and operations management experience to reduce manual work and simplify workforce management.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Flexible for real businesses",
    desc:
      "Supports shops, offices, promoters, part-timers and shift workers.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v12a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Employee self-service",
    desc:
      "Employees can clock in, request forgotten punches and view schedules directly.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
] as const;

const HOW_IT_WORKS = [
  "Register company",
  "Add shops & GPS zones",
  "Add staff",
  "Assign schedules",
  "Staff clock in/out",
  "Track attendance performance",
] as const;

export function HomeLanding() {
  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#2563EB] shadow-sm">
            LW OpsFlow · Workforce platform
          </p>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl">
            OpsFlow Attendance
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#64748B] sm:text-lg">
            Smart attendance and workforce management system for shops and SMEs.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Built from real operations experience to simplify daily operations.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/register" className={btnPrimary("w-full sm:w-auto")}>
              Start Free Trial
            </Link>
            <Link href="/login" className={btnSecondary("w-full sm:w-auto")}>
              Company Login
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#64748B]">
            14-day free trial · No credit card required
          </p>
        </div>
        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <DashboardPreview />
        </div>
      </section>

      {/* Why businesses choose OpsFlow */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            Why businesses choose OpsFlow
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Designed from actual operations experience, not only software assumptions.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                {card.icon}
              </div>
              <h3 className="mt-3 text-base font-semibold text-[#0F172A]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{card.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-[#0F172A]">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#14B8A6]">✓</span>
                    <span className="text-[#0F172A]">{b}</span>
                  </li>
                ))}
              </ul>
              {card.examples.length > 0 ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Examples</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {card.examples.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* What makes OpsFlow special */}
      <section id="features">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">What makes OpsFlow special</h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Practical features built from day-to-day operations needs.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIAL_CARDS.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#14B8A6]">
                {c.icon}
              </span>
              <h3 className="mt-3 text-base font-semibold text-[#0F172A]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How OpsFlow works */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">How OpsFlow works</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((label, idx) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-[#2563EB]">
                  {idx + 1}
                </span>
                <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            Simple pricing for growing businesses
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            All plans include full features. Choose based on your shop and staff size.
          </p>
          <p className="mt-1 text-sm font-medium text-[#2563EB]">
            Simple pricing. No locked features. Pay only for the size of your business.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">14-day free trial</p>
          <p className="mt-1 text-xs text-emerald-800">All features unlocked · No credit card required</p>
          <Link href="/register" className={`${btnPrimary("mt-4 w-full sm:w-auto")}`}>
            Start Free Trial
          </Link>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan, idx) => (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                idx === 1
                  ? "border-[#2563EB] ring-2 ring-[#2563EB]/20"
                  : "border-slate-200"
              }`}
            >
              {idx === 1 ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2563EB] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Popular
                </span>
              ) : null}
              <p className="text-sm font-semibold text-[#64748B]">{plan.name}</p>
              <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                {plan.priceLabel.replace("/month", "")}
                <span className="text-base font-medium text-[#64748B]">/month</span>
              </p>
              <p className="mt-2 text-sm font-medium text-[#0F172A]">
                {plan.maxShops} shops · {plan.maxStaff} staff
              </p>
              <p className="mt-1 text-sm text-[#64748B]">Full features included</p>
              <Link href="/register" className={`${btnSecondary("mt-6 w-full")}`}>
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-sm text-[#64748B]">
          Need more? Add extra shop or staff anytime.
        </p>
      </section>

      {/* Plan features (no locked features) */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Every plan includes</h2>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_HIGHLIGHTS.map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm"
            >
              <span className="text-emerald-600">✓</span>
              {label}
            </div>
          ))}
        </div>
        <ul className="mx-auto mt-6 grid max-w-3xl gap-1 text-sm text-[#64748B] sm:grid-cols-2">
          {ALL_PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-emerald-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-slate-200 bg-[#0F172A] px-6 py-10 text-center shadow-sm sm:px-10">
        <h2 className="text-xl font-bold text-white sm:text-2xl">Ready to simplify attendance?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Join SMEs using OpsFlow Attendance to manage staff time with confidence.
        </p>
        <Link href="/register" className={`${btnPrimary("mt-6 w-full sm:w-auto")} bg-[#2563EB] hover:bg-blue-600`}>
          Start Free Trial
        </Link>
      </section>
    </div>
  );
}

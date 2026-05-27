import Link from "next/link";
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

const FEATURES = [
  {
    title: "GPS Verification",
    desc: "Confirm staff are at the shop before clock in is accepted.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "QR Clock In",
    desc: "Shop-specific QR codes for fast, secure punch entry.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    title: "Indoor Mode",
    desc: "Reliable verification when GPS signal is weak indoors.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: "Photo Proof",
    desc: "Fallback verification with photo when GPS is unavailable.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Shift Scheduling",
    desc: "Fixed hours or shift-based rosters per shop.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Attendance Reports",
    desc: "Day, week, and month reports with schedule comparison.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Multi-shop Support",
    desc: "Manage multiple locations under one company account.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
  },
  {
    title: "Forgot Punch Requests",
    desc: "Staff can request corrections; admins review and approve.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    title: "Performance Tracking",
    desc: "Late, absent, and reliability metrics at a glance.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const PLANS = [
  {
    name: "Free Trial",
    price: "14 days",
    period: "",
    desc: "Full features for new companies",
    staff: "All features included",
    highlight: false,
    cta: "Start Free Trial",
    href: "/register",
  },
  {
    name: "Starter",
    price: "RM29",
    period: "/month",
    desc: "For small teams getting started",
    staff: "Up to 10 staff",
    highlight: true,
    cta: "Start Free Trial",
    href: "/register",
  },
  {
    name: "Business",
    price: "RM79",
    period: "/month",
    desc: "For growing retail operations",
    staff: "Up to 50 staff",
    highlight: false,
    cta: "Start Free Trial",
    href: "/register",
  },
  {
    name: "Enterprise",
    price: "Contact us",
    period: "",
    desc: "Custom setup and support",
    staff: "Unlimited staff",
    highlight: false,
    cta: "Contact Sales",
    href: "mailto:hello@lwopsflow.com",
  },
];

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
            Smart GPS + QR attendance system for shops and SMEs.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Built from real operations experience to simplify workforce management.
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

      {/* How it works */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">How it works</h2>
          <p className="mt-2 text-sm text-[#64748B]">Get up and running in five simple steps</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                {step.icon}
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                Step {step.n}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-[#0F172A]">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Everything you need</h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Professional attendance tools built for retail and SME operations
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#14B8A6]">
                {f.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-[#0F172A]">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#14B8A6]">Our mission</p>
          <h2 className="mt-3 text-2xl font-bold text-[#0F172A] sm:text-3xl">Built for SME operations</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#64748B] sm:text-base">
            LW OpsFlow was built using real operations experience to help businesses reduce manual
            work, improve attendance accuracy and simplify daily operations.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">Simple pricing</h2>
          <p className="mt-2 text-sm text-[#64748B]">Start free, upgrade when you grow</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                plan.highlight
                  ? "border-[#2563EB] ring-2 ring-[#2563EB]/20"
                  : "border-slate-200"
              }`}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2563EB] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Popular
                </span>
              ) : null}
              <p className="text-sm font-semibold text-[#64748B]">{plan.name}</p>
              <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                {plan.price}
                {plan.period ? (
                  <span className="text-base font-medium text-[#64748B]">{plan.period}</span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">{plan.desc}</p>
              <p className="mt-3 text-sm font-medium text-[#0F172A]">{plan.staff}</p>
              <div className="mt-auto pt-6">
                {plan.href.startsWith("mailto") ? (
                  <a href={plan.href} className={btnSecondary("w-full")}>
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href={plan.href}
                    className={plan.highlight ? btnPrimary("w-full") : btnSecondary("w-full")}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
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

import Link from "next/link";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardPreview } from "./DashboardPreview";
import { StickyMobileTrial } from "./StickyMobileTrial";
import { btnPrimary, btnSecondary } from "./MarketingShell";

const TRUST_BADGES = [
  "14-Day Free Trial",
  "No Credit Card Required",
  "Multi-Shop Ready",
  "GPS + QR Attendance",
] as const;

const PROBLEMS = [
  {
    title: "Staff forget to clock in",
    desc: "You only find out at month-end when payroll doesn’t match reality.",
  },
  {
    title: "Buddy punching on shared phones",
    desc: "One device clocks in for multiple people — hours look fine, shop isn’t.",
  },
  {
    title: "GPS fails indoors",
    desc: "Malls and high-rise sites block location — staff can’t punch, lines build up.",
  },
  {
    title: "Manual attendance chasing",
    desc: "WhatsApp groups, spreadsheets, and “did you clock out?” every evening.",
  },
] as const;

const FEATURES = [
  {
    title: "GPS + QR On-Site Punch",
    desc: "Staff scan your shop QR and verify location before clock in/out — no shared tablet login.",
    bullets: ["Multi GPS points", "Indoor confidence mode", "Photo proof fallback"],
  },
  {
    title: "Anti Buddy Punch Protection",
    desc: "Catch buddy punching before it becomes payroll noise — device trust, selfie proof, and risk flags per shop.",
    bullets: ["New device alerts", "Optional selfie proof", "Device mismatch detection"],
    highlight: true,
  },
  {
    title: "Schedules & Attendance Reports",
    desc: "Fixed hours or shift templates. See late, missing punch, and hours vs schedule in one dashboard.",
    bullets: ["Shift templates", "Issue badges", "CSV export"],
  },
  {
    title: "Multi-Shop, One Company",
    desc: "Each branch gets its own GPS, QR, and rules — you manage everything from one admin login.",
    bullets: ["Per-shop setup", "Company-wide reports", "Staff assigned by shop"],
  },
] as const;

const SCENARIOS = [
  {
    title: "Retail Shop",
    desc: "Street-front store with fixed hours. GPS radius at entrance, staff scan QR on arrival.",
  },
  {
    title: "Shopping Mall Kiosk",
    desc: "Weak indoor GPS? Enable confidence mode + location proof so promoters punch without leaving the floor.",
  },
  {
    title: "Promoter Team",
    desc: "Rotating part-timers across locations. Shift templates and shop assignment keep punches authorized.",
  },
  {
    title: "Multi Branch Company",
    desc: "Five shops, one HQ. Separate clock QRs, shared staff roster, consolidated attendance reports.",
  },
] as const;

const STEPS = [
  "Register & start trial",
  "Add shop + GPS",
  "Add staff",
  "Print clock QR",
  "Staff punch · you review",
] as const;

const FAQ = [
  {
    q: "Do staff need to install an app?",
    a: "No. Staff open the shop Clock QR in their mobile browser — scan, select name, punch. No app store download.",
  },
  {
    q: "Does it work inside shopping malls?",
    a: "Yes. Indoor Confidence Mode and optional photo/selfie proof are built for weak-GPS sites.",
  },
  {
    q: "Can I manage more than one shop?",
    a: "Yes. All plans support multiple shops. Each location has its own GPS zone and clock QR.",
  },
  {
    q: "What is Anti Buddy Punch?",
    a: "Per-shop controls that flag new devices, device switching, shared-device use, and optional selfie verification.",
  },
  {
    q: "Is there a free trial?",
    a: "14 days, full features, no credit card. Register your company and set up in minutes.",
  },
  {
    q: "How is pricing calculated?",
    a: "By shop and staff count. Every plan includes the same features — you only scale by size.",
  },
] as const;

function TrustBadges() {
  return (
    <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
      {TRUST_BADGES.map((badge) => (
        <li
          key={badge}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#0F172A] shadow-sm"
        >
          {badge}
        </li>
      ))}
    </ul>
  );
}

export function HomeLanding() {
  return (
    <>
      <div className="space-y-12 pb-32 sm:space-y-16 sm:pb-12">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <BrandLogo size="hero" priority />
            </div>
            <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#2563EB] shadow-sm">
              LW OpsFlow · Built for retail & SME ops
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Stop Chasing Staff.
              <span className="block">Know Who Is Actually On Site.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#64748B] sm:text-lg">
              GPS + QR clock in/out with anti buddy-punch controls, shift schedules, and multi-shop
              attendance reports.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className={btnPrimary("w-full sm:w-auto")}>
                Start Free Trial
              </Link>
              <Link href="/login" className={btnSecondary("w-full sm:w-auto")}>
                Company Login
              </Link>
            </div>
            <TrustBadges />
          </div>
          <div className="mx-auto w-full max-w-lg lg:max-w-none">
            <DashboardPreview />
          </div>
        </section>

        {/* Problems */}
        <section>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
              Common attendance problems
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-sm text-[#64748B]">
              If this sounds like your shop floor, you’re not alone — and you shouldn’t need a
              spreadsheet to fix it.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-[#0F172A]">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
              What you get on day one
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Everything included in every plan. No locked “premium” attendance features.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const highlighted = "highlight" in f && f.highlight === true;
              return (
              <div
                key={f.title}
                className={`rounded-2xl border p-6 shadow-sm ${
                  highlighted
                    ? "border-amber-200 bg-gradient-to-br from-amber-50/90 to-white ring-1 ring-amber-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                {highlighted ? (
                  <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Anti buddy punch
                  </span>
                ) : null}
                <h3 className={`font-semibold text-[#0F172A] ${highlighted ? "mt-2" : ""} text-base`}>
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{f.desc}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-[#0F172A]">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="text-[#14B8A6]">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
            })}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
              Simple pricing that scales with you
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              All features on every plan. Pay for shop and staff size — not feature tiers.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan, idx) => (
              <div
                key={plan.slug}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                  idx === 1 ? "border-[#2563EB] ring-2 ring-[#2563EB]/20" : "border-slate-200"
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
                  <span className="text-base font-medium text-[#64748B]">/mo</span>
                </p>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  {plan.maxShops} shops · {plan.maxStaff} staff
                </p>
                <p className="mt-4 text-xs text-[#64748B]">{plan.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[#64748B]">
            {TRUST_BADGES.join(" · ")}
          </p>
        </section>

        {/* Scenarios */}
        <section>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
              Built for real business scenarios
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Same platform — tuned per shop for how you actually operate.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SCENARIOS.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-sm font-bold text-[#2563EB]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works — compact */}
        <section>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">How it works</h2>
          </div>
          <ol className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className="flex flex-1 min-w-[140px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#2563EB]">
                  {i + 1}
                </span>
                <span className="font-medium text-[#0F172A]">{label}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Founder story */}
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10">
          <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">Founder story</p>
          <h2 className="mt-2 text-xl font-bold text-[#0F172A] sm:text-2xl">
            Built from real retail operations experience.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#64748B] sm:text-base">
            LW OpsFlow started on shop floors — chasing missing clock-outs, fixing buddy punches,
            and reconciling mall kiosks with spreadsheets. We built OpsFlow Attendance so managers
            spend less time verifying hours and more time running the business.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">FAQ</h2>
          </div>
          <dl className="mx-auto mt-8 max-w-2xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {FAQ.map((item) => (
              <div key={item.q} className="px-5 py-4">
                <dt className="text-sm font-semibold text-[#0F172A]">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Final CTA */}
        <section className="rounded-2xl border border-slate-200 bg-[#0F172A] px-6 py-10 text-center shadow-sm sm:px-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Stop chasing attendance. Start proving it.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Join SMEs using LW OpsFlow to run cleaner shops with trustworthy punch data.
          </p>
          <Link
            href="/register"
            className={`${btnPrimary("mt-6 w-full sm:w-auto")} bg-[#2563EB] hover:bg-blue-600`}
          >
            Start Free Trial — 14 Days Free
          </Link>
        </section>
      </div>
      <StickyMobileTrial />
    </>
  );
}

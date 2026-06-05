"use client";

import Link from "next/link";
import { planLimitsShortLabel, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { DashboardPreview } from "./DashboardPreview";
import { StickyMobileTrial } from "./StickyMobileTrial";
import { btnPrimary, btnSecondary } from "./MarketingShell";

export function HomeLanding() {
  const { t } = useI18n();

  const trustBadges = [
    t("landing.trust.trial"),
    t("landing.trust.noCard"),
    t("landing.trust.multiShop"),
    t("landing.trust.gpsQr"),
    t("landing.trust.payroll"),
    t("landing.trust.security"),
  ];

  const productFeatures = [
    t("landing.productFeatures.gpsQr"),
    t("landing.productFeatures.multiShop"),
    t("landing.productFeatures.scheduling"),
    t("landing.productFeatures.payroll"),
    t("landing.productFeatures.security"),
    t("landing.productFeatures.reports"),
  ];

  const problems = [
    { title: t("landing.problems.forgetIn.title"), desc: t("landing.problems.forgetIn.desc") },
    { title: t("landing.problems.buddy.title"), desc: t("landing.problems.buddy.desc") },
    { title: t("landing.problems.gps.title"), desc: t("landing.problems.gps.desc") },
    { title: t("landing.problems.manual.title"), desc: t("landing.problems.manual.desc") },
  ];

  const features = [
    {
      title: t("landing.pillars.visibility.title"),
      desc: t("landing.pillars.visibility.desc"),
      bullets: [
        t("landing.pillars.visibility.b1"),
        t("landing.pillars.visibility.b2"),
        t("landing.pillars.visibility.b3"),
      ],
    },
    {
      title: t("landing.pillars.discipline.title"),
      desc: t("landing.pillars.discipline.desc"),
      bullets: [
        t("landing.pillars.discipline.b1"),
        t("landing.pillars.discipline.b2"),
        t("landing.pillars.discipline.b3"),
      ],
      highlight: true,
    },
    {
      title: t("landing.pillars.gps.title"),
      desc: t("landing.pillars.gps.desc"),
      bullets: [t("landing.pillars.gps.b1"), t("landing.pillars.gps.b2"), t("landing.pillars.gps.b3")],
    },
    {
      title: t("landing.pillars.schedule.title"),
      desc: t("landing.pillars.schedule.desc"),
      bullets: [
        t("landing.pillars.schedule.b1"),
        t("landing.pillars.schedule.b2"),
        t("landing.pillars.schedule.b3"),
      ],
    },
    {
      title: t("landing.pillars.dashboard.title"),
      desc: t("landing.pillars.dashboard.desc"),
      bullets: [
        t("landing.pillars.dashboard.b1"),
        t("landing.pillars.dashboard.b2"),
        t("landing.pillars.dashboard.b3"),
      ],
    },
  ];

  const scenarios = [
    { title: t("landing.scenarios.retail.title"), desc: t("landing.scenarios.retail.desc") },
    { title: t("landing.scenarios.mall.title"), desc: t("landing.scenarios.mall.desc") },
    { title: t("landing.scenarios.promoter.title"), desc: t("landing.scenarios.promoter.desc") },
    { title: t("landing.scenarios.multi.title"), desc: t("landing.scenarios.multi.desc") },
  ];

  const steps = [
    t("landing.steps.s1"),
    t("landing.steps.s2"),
    t("landing.steps.s3"),
    t("landing.steps.s4"),
    t("landing.steps.s5"),
  ];

  const faq = [
    { q: t("landing.faq.app.q"), a: t("landing.faq.app.a") },
    { q: t("landing.faq.mall.q"), a: t("landing.faq.mall.a") },
    { q: t("landing.faq.multi.q"), a: t("landing.faq.multi.a") },
    { q: t("landing.faq.buddy.q"), a: t("landing.faq.buddy.a") },
    { q: t("landing.faq.trial.q"), a: t("landing.faq.trial.a") },
    { q: t("landing.faq.pricing.q"), a: t("landing.faq.pricing.a") },
  ];

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
              {t("landing.badge")}
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              {t("landing.heroTitle1")}
              {t("landing.heroTitle2") ? (
                <span className="block">{t("landing.heroTitle2")}</span>
              ) : null}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#64748B] sm:text-lg">
              {t("landing.heroSubtitle")}
            </p>
            <ul className="mt-5 grid gap-2 text-left text-sm text-[#0F172A] sm:grid-cols-2">
              {productFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className={btnPrimary("w-full sm:w-auto")}>
                {t("landing.ctaButton")}
              </Link>
              <Link href="/login" className={btnSecondary("w-full sm:w-auto")}>
                {t("marketing.companyLogin")}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#0F172A] shadow-sm"
                >
                  {badge}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-lg lg:max-w-none">
            <DashboardPreview />
          </div>
        </section>

        {/* Problems */}
        <section>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{t("landing.problemsTitle")}</h2>
            <p className="mt-2 max-w-xl mx-auto text-sm text-[#64748B]">{t("landing.problemsSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {problems.map((p) => (
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
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-2 text-sm text-[#64748B]">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((f) => {
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
                    {t("landing.antiBuddyBadge")}
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
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{t("landing.pricingTitle")}</h2>
            <p className="mt-2 text-sm text-[#64748B]">{t("landing.pricingSubtitle")}</p>
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
                    {t("landing.popular")}
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-[#64748B]">{plan.name}</p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  {plan.priceLabel.replace("/month", "")}
                  <span className="text-base font-medium text-[#64748B]">/mo</span>
                </p>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  {planLimitsShortLabel(plan)}
                </p>
                <p className="mt-4 text-xs text-[#64748B]">{plan.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[#64748B]">
            {trustBadges.join(" · ")}
          </p>
        </section>

        {/* Scenarios */}
        <section>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{t("landing.scenariosTitle")}</h2>
            <p className="mt-2 text-sm text-[#64748B]">{t("landing.scenariosSubtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((s) => (
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
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{t("landing.howItWorksTitle")}</h2>
          </div>
          <ol className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {steps.map((label, i) => (
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
          <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">{t("landing.founderLabel")}</p>
          <h2 className="mt-2 text-xl font-bold text-[#0F172A] sm:text-2xl">{t("landing.founderTitle")}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#64748B] sm:text-base">
            {t("landing.founderBody")}
          </p>
        </section>

        {/* FAQ */}
        <section id="faq">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">{t("landing.faqTitle")}</h2>
          </div>
          <dl className="mx-auto mt-8 max-w-2xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {faq.map((item) => (
              <div key={item.q} className="px-5 py-4">
                <dt className="text-sm font-semibold text-[#0F172A]">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Final CTA */}
        <section className="rounded-2xl border border-slate-200 bg-[#0F172A] px-6 py-10 text-center shadow-sm sm:px-10">
          <h2 className="text-xl font-bold text-white sm:text-2xl">{t("landing.ctaTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{t("landing.ctaSubtitle")}</p>
          <Link
            href="/register"
            className={`${btnPrimary("mt-6 w-full sm:w-auto")} bg-[#2563EB] hover:bg-blue-600`}
          >
            {t("landing.ctaButton")}
          </Link>
        </section>
      </div>
      <StickyMobileTrial />
    </>
  );
}

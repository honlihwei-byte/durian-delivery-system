"use client";

import Link from "next/link";
import { planLimitsShortLabel, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardPreview } from "./DashboardPreview";
import { StickyMobileTrial } from "./StickyMobileTrial";
import { btnPrimary, btnSecondary } from "./MarketingShell";

// ─── Small primitives ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-700">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">
      {children}
    </h2>
  );
}

function FeatureIcon({ children, bg }: { children: string; bg: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${bg}`}
    >
      {children}
    </span>
  );
}

// ─── Score pill used in Section 5 ────────────────────────────────────────────

function ScoreCard({
  label,
  score,
  delta,
  what,
  color,
}: {
  label: string;
  score: number;
  delta: string;
  what: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</p>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-4xl font-extrabold leading-none">{score}</span>
        <span className="mb-1 rounded-full border border-current/20 bg-current/10 px-2 py-0.5 text-[11px] font-bold">
          {delta}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed opacity-70">{what}</p>
    </div>
  );
}

// ─── Outlet widget used in Section 6 ─────────────────────────────────────────

function OutletWidget({
  icon,
  title,
  value,
  sub,
  accent,
}: {
  icon: string;
  title: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border p-4 ${accent}`}>
      <span className="text-xl">{icon}</span>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{title}</p>
      <p className="text-lg font-bold leading-snug">{value}</p>
      <p className="text-xs opacity-60">{sub}</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function HomeLanding() {
  return (
    <>
      <div className="space-y-20 pb-36 sm:space-y-24 sm:pb-16">

        {/* ── SECTION 1: HERO ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start">
              <BrandLogo size="hero" priority />
            </div>

            <p className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-700">
              Retail Operations Intelligence Platform
            </p>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Manage Every Outlet{" "}
              <span className="text-[#2563EB]">With Data,</span>
              <span className="block">Not Guesswork</span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-[#64748B] sm:text-lg">
              See attendance, task completion, reliability, operational discipline,
              and outlet performance in one dashboard.
            </p>
            <p className="mt-2 text-base font-semibold text-[#0F172A] sm:text-lg">
              Stop chasing staff.{" "}
              <span className="text-[#2563EB]">Start understanding your business.</span>
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className={btnPrimary("w-full sm:w-auto")}>
                Start Free Trial
              </Link>
              <Link
                href="mailto:support@lwopsflow.com?subject=Demo Request"
                className={btnSecondary("w-full sm:w-auto")}
              >
                Book Demo
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {[
                "14-day free trial",
                "No credit card",
                "Multi-outlet ready",
                "Mobile-friendly",
              ].map((badge) => (
                <li
                  key={badge}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#0F172A] shadow-sm"
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

        {/* ── SECTION 2: THE PROBLEM ──────────────────────────────────────── */}
        <section id="problem">
          <div className="text-center">
            <SectionLabel>The Problem</SectionLabel>
            <SectionHeading>Good Employees Often Go Unnoticed</SectionHeading>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-base">
              Without a clear record of performance, decisions get made on memory, gut feeling,
              and who is most visible — not who actually contributes.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "👤",
                title: "Hard workers go unrecognised",
                desc: "High-performing staff are treated the same as poor performers when there's no data to show the difference.",
              },
              {
                icon: "🧠",
                title: "Managers rely on memory",
                desc: "Decisions during performance reviews are based on recent impressions — not months of consistent behaviour.",
              },
              {
                icon: "⏰",
                title: "Outlet problems discovered too late",
                desc: "Issues like repeated lateness or missed tasks only surface when they've already become serious.",
              },
              {
                icon: "⚖️",
                title: "Performance reviews become subjective",
                desc: "Without data, evaluations favour those who are vocal or well-liked rather than those who consistently deliver.",
              },
              {
                icon: "📉",
                title: "Strong employees lose motivation",
                desc: "When effort is invisible, top performers quietly disengage. The system rewards the wrong behaviour.",
              },
              {
                icon: "🔍",
                title: "No visibility across outlets",
                desc: "Multi-outlet owners can't compare consistency, compliance, or reliability without visiting in person.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="mt-0.5 text-2xl">{p.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: THE SOLUTION ─────────────────────────────────────── */}
        <section id="features">
          <div className="text-center">
            <SectionLabel>The Solution</SectionLabel>
            <SectionHeading>Make Performance Visible</SectionHeading>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-base">
              Every module connects to give you a complete picture of how your outlets and
              people are actually performing.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              {
                icon: "🕐",
                bg: "bg-blue-50 text-blue-600",
                title: "Attendance Tracking",
                desc: "QR + GPS clock-in/out with anti buddy-punch controls. Know exactly who is on site and when.",
              },
              {
                icon: "✅",
                bg: "bg-emerald-50 text-emerald-600",
                title: "Task Accountability",
                desc: "Assign, track, and verify daily tasks. Know what was completed, what was skipped, and by whom.",
              },
              {
                icon: "📸",
                bg: "bg-violet-50 text-violet-600",
                title: "Photo Verification",
                desc: "Staff submit photo proof for task completion. Reviewers accept, mark fair, or reject with feedback.",
              },
              {
                icon: "📋",
                bg: "bg-teal-50 text-teal-600",
                title: "Operational Compliance",
                desc: "Set checklists for opening, closing, and daily routines. Track whether procedures are actually followed.",
              },
              {
                icon: "🏬",
                bg: "bg-amber-50 text-amber-600",
                title: "Multi-Shop Monitoring",
                desc: "Compare outlet health, staff performance, and task completion across every location in one view.",
              },
              {
                icon: "📊",
                bg: "bg-rose-50 text-rose-600",
                title: "Reliability Insights",
                desc: "Each staff member gets a reliability score based on attendance patterns, task completion, and consistency.",
              },
              {
                icon: "🔔",
                bg: "bg-sky-50 text-sky-600",
                title: "Notifications & Alerts",
                desc: "Get alerted on late arrivals, missed tasks, and operational risks before they escalate.",
              },
              {
                icon: "📅",
                bg: "bg-indigo-50 text-indigo-600",
                title: "Shift Scheduling",
                desc: "Build rosters, assign shifts, and automatically detect conflicts or coverage gaps.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <FeatureIcon bg={f.bg}>{f.icon}</FeatureIcon>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: FAIR MANAGEMENT ──────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-[#1E3A5F] to-slate-900 px-6 py-12 shadow-xl sm:px-10 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Our Philosophy</SectionLabel>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Fair Management Starts With Transparency
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-4xl lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
            <div className="space-y-5 text-[#94A3B8]">
              <p className="text-base leading-relaxed sm:text-lg">
                LW OpsFlow does not replace managers.{" "}
                <span className="font-semibold text-white">
                  It gives managers better information.
                </span>
              </p>
              <p className="text-sm leading-relaxed sm:text-base">
                When decisions are supported by data, everyone benefits — not just the people
                who are loudest in the room.
              </p>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed italic text-white/80">
                "Employees should be evaluated based on actions and results — not assumptions,
                memory, or personal impressions."
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-0">
              {[
                {
                  icon: "🏆",
                  text: "High performers receive recognition based on consistent data",
                },
                {
                  icon: "🎯",
                  text: "Coaching becomes objective — backed by traceable records",
                },
                {
                  icon: "🔦",
                  text: "Outlet issues become visible earlier, not after damage is done",
                },
                {
                  icon: "🤝",
                  text: "Teams trust the process more when evaluation is transparent",
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-sm leading-relaxed text-[#CBD5E1]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-[#64748B]">
            The goal is not employee surveillance.{" "}
            <span className="font-semibold text-slate-400">
              The goal is operational transparency and fair management.
            </span>
          </p>
        </section>

        {/* ── SECTION 5: RELIABILITY INSIGHTS ─────────────────────────────── */}
        <section id="insights">
          <div className="text-center">
            <SectionLabel>Reliability Insights</SectionLabel>
            <SectionHeading>See The Story Behind The Numbers</SectionHeading>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-base">
              Every score is explainable and traceable. Staff and managers can understand{" "}
              <em>why</em> a score moved — not just what it is.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              label="Reliability Score"
              score={84}
              delta="+3 this week"
              what="Based on consistent attendance patterns, punctuality, and absence of late or missed punches."
              color="border-emerald-100 bg-emerald-50 text-emerald-800"
            />
            <ScoreCard
              label="Attendance Score"
              score={91}
              delta="+2 this week"
              what="Percentage of scheduled days attended on time. Absences and late arrivals reduce this score."
              color="border-blue-100 bg-blue-50 text-blue-800"
            />
            <ScoreCard
              label="Task Completion"
              score={78}
              delta="−4 this week"
              what="How consistently assigned tasks are completed before deadline. Overdue and skipped tasks reduce this."
              color="border-amber-100 bg-amber-50 text-amber-800"
            />
            <ScoreCard
              label="Operational Consistency"
              score={88}
              delta="+1 this week"
              what="Tracks whether daily procedures — checklists, openings, closings — are followed as required."
              color="border-violet-100 bg-violet-50 text-violet-800"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#0F172A]">
              Example: Why did Daniel&apos;s reliability score drop from 82 → 74?
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {[
                { event: "3× late arrival", impact: "−4 pts", color: "border-red-100 bg-red-50 text-red-700" },
                {
                  event: "2 tasks missed",
                  impact: "−3 pts",
                  color: "border-amber-100 bg-amber-50 text-amber-700",
                },
                {
                  event: "1 early clock-out",
                  impact: "−1 pt",
                  color: "border-orange-100 bg-orange-50 text-orange-700",
                },
              ].map((row) => (
                <div
                  key={row.event}
                  className={`flex flex-1 items-center justify-between rounded-xl border px-4 py-3 ${row.color}`}
                >
                  <span className="text-sm font-medium">{row.event}</span>
                  <span className="text-sm font-bold">{row.impact}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#64748B]">
              Every factor is recorded. Managers can drill down to the exact punch or task
              that triggered the change.
            </p>
          </div>
        </section>

        {/* ── SECTION 6: OUTLET INTELLIGENCE ──────────────────────────────── */}
        <section id="outlets">
          <div className="text-center">
            <SectionLabel>Outlet Intelligence</SectionLabel>
            <SectionHeading>Understand Every Outlet At A Glance</SectionHeading>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-base">
              Whether you manage one location or fifty, the same visibility is available
              from your phone or desktop.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OutletWidget
              icon="🚀"
              title="Most Improved Outlet"
              value="Subang PJ"
              sub="Reliability up 12 pts this month. Task completion now at 94%."
              accent="border-emerald-100 bg-emerald-50 text-emerald-900"
            />
            <OutletWidget
              icon="⚠️"
              title="Needs Attention"
              value="Mall Outlet"
              sub="3 overdue tasks. 2 staff with declining reliability. Manager review recommended."
              accent="border-amber-100 bg-amber-50 text-amber-900"
            />
            <OutletWidget
              icon="⭐"
              title="Top Reliability Staff"
              value="Aina M. · 94"
              sub="Consistent attendance, zero missed tasks this quarter. Recognised automatically."
              accent="border-blue-100 bg-blue-50 text-blue-900"
            />
            <OutletWidget
              icon="📈"
              title="Task Completion Trends"
              value="+8% this month"
              sub="Trend is improving across all outlets since checklist reminders were enabled."
              accent="border-violet-100 bg-violet-50 text-violet-900"
            />
            <OutletWidget
              icon="🔒"
              title="Operational Risks"
              value="2 flagged today"
              sub="Opening checklist incomplete at Main Branch. Closing procedure skipped at Ara Damansara."
              accent="border-rose-100 bg-rose-50 text-rose-900"
            />
            <OutletWidget
              icon="📅"
              title="Attendance Overview"
              value="91% on time"
              sub="18 of 20 scheduled staff clocked in on time today. 1 late, 1 absent."
              accent="border-teal-100 bg-teal-50 text-teal-900"
            />
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────────────────────── */}
        <section id="pricing">
          <div className="text-center">
            <SectionLabel>Pricing</SectionLabel>
            <SectionHeading>Simple, Transparent Pricing</SectionHeading>
            <p className="mt-3 text-sm text-[#64748B]">
              All plans include every feature. No hidden tiers. Start free for 14 days.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
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
                    Most popular
                  </span>
                ) : null}
                <p className="text-sm font-bold text-[#64748B]">{plan.name}</p>
                <p className="mt-2 text-3xl font-extrabold text-[#0F172A]">
                  {plan.priceLabel.replace("/month", "")}
                  <span className="text-base font-medium text-[#64748B]">/mo</span>
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[#0F172A]">
                  {planLimitsShortLabel(plan)}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-[#64748B]">{plan.description}</p>
                <Link
                  href="/register"
                  className={`mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition ${
                    idx === 1
                      ? "bg-[#2563EB] text-white hover:bg-blue-700"
                      : "border border-slate-200 text-[#0F172A] hover:bg-slate-50"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[#64748B]">
            14-day free trial · No credit card required · Cancel anytime
          </p>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq">
          <div className="text-center">
            <SectionLabel>FAQ</SectionLabel>
            <SectionHeading>Common Questions</SectionHeading>
          </div>

          <dl className="mx-auto mt-10 max-w-2xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {[
              {
                q: "Is this an employee surveillance tool?",
                a: "No. LW OpsFlow is designed for operational transparency, not monitoring. The goal is to help managers make fair decisions using data — not to track every movement of staff.",
              },
              {
                q: "Do staff need a smartphone app?",
                a: "Staff can clock in and out using any phone browser via QR code — no app download required. Optional GPS verification is available for outdoor or multi-location teams.",
              },
              {
                q: "Can I manage multiple outlets from one account?",
                a: "Yes. All plans support multiple shops. The dashboard lets you compare performance, tasks, and attendance across every outlet in one view.",
              },
              {
                q: "What is a Reliability Score?",
                a: "It is an automatically calculated score based on each staff member's attendance consistency, task completion rate, and operational discipline. Every factor is traceable.",
              },
              {
                q: "Can managers adjust or override scores?",
                a: "Managers can leave notes, approve exceptions, and mark issues as reviewed. Scores reflect actual recorded data and are not manually inflated.",
              },
              {
                q: "How long is the free trial?",
                a: "14 days, no credit card required. All features are available from day one.",
              },
            ].map((item) => (
              <div key={item.q} className="px-6 py-5">
                <dt className="text-sm font-bold text-[#0F172A]">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[#64748B]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── SECTION 7: FINAL CTA ────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[#0F172A] px-6 py-14 text-center shadow-xl sm:px-10 sm:py-16">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/60">
            Get Started
          </p>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Build A More Consistent Business
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
            Whether you manage one outlet or fifty, better decisions start with better
            visibility.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="w-full rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-600 sm:w-auto"
            >
              Start Free Trial
            </Link>
            <Link
              href="mailto:support@lwopsflow.com?subject=Demo Request"
              className="w-full rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/5 sm:w-auto"
            >
              Book Demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            14-day trial · No credit card · Cancel anytime
          </p>
        </section>
      </div>

      <StickyMobileTrial />
    </>
  );
}

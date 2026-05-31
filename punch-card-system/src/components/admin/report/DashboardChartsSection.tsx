"use client";

import type { ReportSummary } from "@/lib/attendance-report";
import { dashboardCard } from "./dashboard-ui";

type Activity = {
  id: string;
  staff: string;
  action: string;
  time: string;
  tone: "success" | "warning" | "neutral";
};

type Props = {
  summary: ReportSummary;
  activities?: Activity[];
};

/** Placeholder 7-day trend until wired to historical API. */
const PLACEHOLDER_WEEK = [
  { day: "Mon", value: 12 },
  { day: "Tue", value: 15 },
  { day: "Wed", value: 14 },
  { day: "Thu", value: 18 },
  { day: "Fri", value: 16 },
  { day: "Sat", value: 9 },
  { day: "Sun", value: 7 },
];

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: "1", staff: "Staff member", action: "Clocked in", time: "Just now", tone: "success" },
  { id: "2", staff: "Staff member", action: "GPS verified", time: "5m ago", tone: "neutral" },
  { id: "3", staff: "Staff member", action: "Review required", time: "12m ago", tone: "warning" },
];

function LineChart() {
  const max = Math.max(...PLACEHOLDER_WEEK.map((d) => d.value), 1);
  const w = 320;
  const h = 120;
  const pad = 8;
  const points = PLACEHOLDER_WEEK.map((d, i) => {
    const x = pad + (i / (PLACEHOLDER_WEEK.length - 1)) * (w - pad * 2);
    const y = h - pad - (d.value / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#lineFill)"
        stroke="none"
        points={`${points} ${w - pad},${h - pad} ${pad},${h - pad}`}
      />
      <polyline
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function DonutChart({ present, total }: { present: number; total: number }) {
  const safeTotal = Math.max(total, present, 1);
  const pct = Math.min(100, Math.round((present / safeTotal) * 100));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r / 2.2} fill="none" stroke="#E2E8F0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r / 2.2}
          fill="none"
          stroke="#2563EB"
          strokeWidth="10"
          strokeDasharray={c / 2.2}
          strokeDashoffset={offset / 2.2}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#0F172A]">{present}</span>
        <span className="text-xs font-medium text-[#64748B]">{pct}% present</span>
      </div>
    </div>
  );
}

const ACTIVITY_DOT: Record<Activity["tone"], string> = {
  success: "bg-[#22C55E]",
  warning: "bg-[#F59E0B]",
  neutral: "bg-[#64748B]",
};

export function DashboardChartsSection({ summary, activities }: Props) {
  const list = activities && activities.length > 0 ? activities : DEFAULT_ACTIVITIES;
  const totalStaff = Math.max(summary.total_present_staff + 5, summary.total_present_staff);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className={`${dashboardCard} flex flex-col p-5`}>
        <h3 className="text-sm font-semibold text-[#0F172A]">Attendance overview</h3>
        <p className="mt-0.5 text-xs font-normal text-[#64748B]">Last 7 days · sample data</p>
        <div className="mt-4 h-32">
          <LineChart />
        </div>
        <div className="mt-3 flex justify-between text-[11px] font-medium text-[#64748B]">
          {PLACEHOLDER_WEEK.map((d) => (
            <span key={d.day}>{d.day}</span>
          ))}
        </div>
      </section>

      <section className={`${dashboardCard} flex flex-col p-5`}>
        <h3 className="text-sm font-semibold text-[#0F172A]">Present staff</h3>
        <p className="mt-0.5 text-xs font-normal text-[#64748B]">Today&apos;s attendance rate</p>
        <div className="mt-2 flex flex-1 items-center justify-center">
          <DonutChart present={summary.total_present_staff} total={totalStaff} />
        </div>
      </section>

      <section className={`${dashboardCard} flex flex-col p-5`}>
        <h3 className="text-sm font-semibold text-[#0F172A]">Recent activities</h3>
        <p className="mt-0.5 text-xs font-normal text-[#64748B]">Latest punch events</p>
        <ul className="mt-4 space-y-3">
          {list.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOT[a.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0F172A]">{a.staff}</p>
                <p className="text-xs text-[#64748B]">{a.action}</p>
              </div>
              <span className="shrink-0 text-[11px] text-[#64748B]">{a.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

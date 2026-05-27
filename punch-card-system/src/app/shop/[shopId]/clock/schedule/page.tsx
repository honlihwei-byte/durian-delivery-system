"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type DayCard = {
  date: string;
  status: "today" | "upcoming" | "completed" | "off_day";
  shifts: Array<{
    shop_id: string;
    shop_name: string | null;
    template_name: string | null;
    start_time: string;
    end_time: string;
    break_minutes: number;
  }>;
};

function weekdayLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("en-MY", { weekday: "long" });
}

function dateLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function tone(status: DayCard["status"]): { bg: string; text: string; chip: string } {
  switch (status) {
    case "today":
      return { bg: "bg-emerald-50", text: "text-emerald-900", chip: "bg-emerald-100 text-emerald-800" };
    case "upcoming":
      return { bg: "bg-blue-50", text: "text-blue-900", chip: "bg-blue-100 text-blue-800" };
    case "completed":
      return { bg: "bg-slate-50", text: "text-slate-700", chip: "bg-slate-100 text-slate-600" };
    case "off_day":
      return { bg: "bg-zinc-50", text: "text-zinc-700", chip: "bg-zinc-100 text-zinc-600" };
  }
}

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export default function MySchedulePage() {
  const sp = useSearchParams();
  const shopId = sp.get("shop_id") ?? "";
  const staffId = sp.get("staff_id") ?? "";
  const staffIdentifier = sp.get("staff_identifier") ?? "";

  const [tab, setTab] = useState<"this" | "next">("this");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DayCard[]>([]);
  const [mode, setMode] = useState<"fixed" | "shift_based" | null>(null);
  const [workingHours, setWorkingHours] = useState<{ start_time: string; end_time: string; break_minutes: number } | null>(null);

  const canLoad = useMemo(() => Boolean(shopId && (staffId || staffIdentifier)), [shopId, staffId, staffIdentifier]);

  async function load(week: "this" | "next") {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ shop_id: shopId, week });
      if (staffId) qs.set("staff_id", staffId);
      if (staffIdentifier) qs.set("staff_identifier", staffIdentifier);
      const res = await fetch(`/api/attendance/my-schedule?${qs.toString()}`);
      if (!res.ok) throw new Error(await readErr(res));
      const j = (await res.json()) as any;
      setMode(j.mode ?? null);
      setWorkingHours(j.working_hours ?? null);
      setDays((j.days ?? []) as DayCard[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setDays([]);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  if (days.length === 0 && !loading && !error && canLoad) {
    void load(tab);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">My Schedule</p>
          <p className="text-sm font-semibold text-zinc-900">Upcoming shifts</p>
        </div>
        <Link href={shopId ? `/shop/${encodeURIComponent(shopId)}/clock` : "/clock"} className="text-sm font-semibold text-blue-600 underline">
          Back
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
            tab === "this" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900"
          }`}
          onClick={() => {
            setTab("this");
            void load("this");
          }}
        >
          This Week
        </button>
        <button
          type="button"
          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
            tab === "next" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-900"
          }`}
          onClick={() => {
            setTab("next");
            void load("next");
          }}
        >
          Next Week
        </button>
      </div>

      {mode === "fixed" && workingHours ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Working hours</p>
          <p className="mt-1 text-lg font-bold text-zinc-900">
            {workingHours.start_time} - {workingHours.end_time}
          </p>
          <p className="mt-1 text-sm text-zinc-600">Break: {workingHours.break_minutes} min</p>
          <p className="mt-3 text-xs text-zinc-500">This shop uses fixed working time. Shifts are not shown.</p>
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      {mode === "shift_based" ? (
        <div className="space-y-3">
          {days.map((d) => {
            const t = tone(d.status);
            if (d.status === "off_day" || d.shifts.length === 0) {
              return (
                <div key={d.date} className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {weekdayLabel(d.date)}, {dateLabel(d.date)}
                      </p>
                      <p className="mt-2 text-lg font-bold text-zinc-800">OFF DAY</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.chip}`}>Off day</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={d.date} className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {weekdayLabel(d.date)}, {dateLabel(d.date)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.chip}`}>
                    {d.status === "today" ? "Today" : d.status === "completed" ? "Completed" : "Upcoming"}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {d.shifts.map((s, idx) => (
                    <div key={`${s.shop_id}-${idx}`} className={`rounded-xl border border-zinc-200 ${t.bg} p-3`}>
                      <p className="text-sm font-semibold text-zinc-900">{s.shop_name ?? "Shop"}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Shift</p>
                          <p className={`mt-0.5 text-sm font-semibold ${t.text}`}>{s.template_name ?? "Shift"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Time</p>
                          <p className={`mt-0.5 text-sm font-semibold ${t.text}`}>
                            {s.start_time} - {s.end_time}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Break</p>
                          <p className="mt-0.5 text-sm font-semibold text-zinc-700">{s.break_minutes} min</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!canLoad ? (
        <p className="text-sm text-zinc-500">Select your staff on the clock page first.</p>
      ) : null}
    </div>
  );
}


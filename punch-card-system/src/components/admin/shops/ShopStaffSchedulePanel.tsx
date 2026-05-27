"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import type { ShopShiftTemplate } from "./ShopShiftTemplatesPanel";

type Staff = { id: string; staff_name: string; staff_code: string };
type ScheduleRow = {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  template_id: string | null;
  is_off_day: boolean;
  status: string;
};

function mondayOfWeek(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
}

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function ShopStaffSchedulePanel({
  shopId,
  workTimeMode,
  shopHours,
}: {
  shopId: string;
  workTimeMode: "fixed" | "shift_based";
  shopHours: { opening: string; closing: string; break_minutes: number };
}) {
  const today = malaysiaDateYmd(new Date());
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(today));
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [templates, setTemplates] = useState<ShopShiftTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulkDate, setBulkDate] = useState(today);
  const [activeCell, setActiveCell] = useState<{ staffId: string; date: string } | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6]!;

  const rowMap = useMemo(() => {
    const m = new Map<string, ScheduleRow>();
    for (const r of rows) {
      if (r.status !== "active") continue;
      m.set(`${r.staff_id}:${r.shift_date}`, r);
    }
    return m;
  }, [rows]);

  const templateLabel = useMemo(() => {
    const m = new Map(templates.map((t) => [t.id, t]));
    return (r: ScheduleRow | undefined): string => {
      if (!r) return "";
      if (r.is_off_day) return "OFF";
      const tpl = r.template_id ? m.get(r.template_id) : null;
      if (tpl) return `${tpl.name} ${tpl.start_time}–${tpl.end_time}`;
      if (r.start_time && r.end_time) return `${r.start_time}–${r.end_time}`;
      return "";
    };
  }, [templates]);

  const load = useCallback(async () => {
    if (workTimeMode !== "shift_based") return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from: weekStart, to: weekEnd });
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/staff-schedule?${qs}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readErr(res));
      const j = (await res.json()) as {
        staff?: Staff[];
        rows?: ScheduleRow[];
        templates?: ShopShiftTemplate[];
      };
      setStaff(j.staff ?? []);
      setRows(j.rows ?? []);
      setTemplates(j.templates ?? []);
      if (!bulkTemplateId && (j.templates ?? []).length > 0) {
        setBulkTemplateId(j.templates![0]!.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [shopId, weekStart, weekEnd, workTimeMode, bulkTemplateId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(staffId: string, date: string, body: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/staff-schedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId, shift_date: date, ...body }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      setActiveCell(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    }
  }

  async function bulkAssign(isOff = false) {
    if (selectedStaff.length === 0) {
      setError("Select staff first");
      return;
    }
    if (!isOff && !bulkTemplateId) {
      setError("Select a shift template");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/staff-schedule/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_ids: selectedStaff,
          shift_date: bulkDate,
          template_id: isOff ? undefined : bulkTemplateId,
          is_off_day: isOff,
        }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk assign failed");
    }
  }

  async function copyPreviousWeek() {
    setError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/staff-schedule/copy-week`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy week failed");
    }
  }

  async function copyPreviousDay(date: string) {
    setError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/staff-schedule/copy-day`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_date: date }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy day failed");
    }
  }

  if (workTimeMode === "fixed") {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="font-semibold text-emerald-900 dark:text-emerald-100">Fixed working time</p>
        <p className="mt-1 text-emerald-800 dark:text-emerald-200">
          All punch-authorized staff use shop hours: {shopHours.opening}–{shopHours.closing} (
          {shopHours.break_minutes}m break). No per-staff assignment needed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Staff schedule
          </p>
          <p className="text-xs text-zinc-500">
            Showing staff authorized for this shop only · click a cell to assign
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
          >
            ← Prev week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(mondayOfWeek(today))}
            className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
          >
            Next week →
          </button>
          <button
            type="button"
            onClick={() => void copyPreviousWeek()}
            className="rounded bg-zinc-800 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900"
          >
            Copy previous week
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {loading ? <p className="text-xs text-zinc-500">Loading…</p> : null}

      {staff.length === 0 && !loading ? (
        <p className="text-sm text-zinc-500">No punch-authorized staff assigned to this shop.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-900">
                <th className="sticky left-0 z-10 bg-zinc-100 px-2 py-2 text-left dark:bg-zinc-900">Staff</th>
                {weekDays.map((d) => (
                  <th key={d} className="min-w-[88px] px-1 py-2 text-center font-medium">
                    {dayLabel(d)}
                    <button
                      type="button"
                      title="Copy previous day"
                      onClick={() => void copyPreviousDay(d)}
                      className="ml-1 text-[10px] text-blue-600 underline"
                    >
                      copy
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-medium dark:bg-zinc-950">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(s.id)}
                        onChange={(e) => {
                          setSelectedStaff((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                          );
                        }}
                      />
                      <span>
                        {s.staff_name}
                        <span className="block font-normal text-zinc-500">{s.staff_code}</span>
                      </span>
                    </label>
                  </td>
                  {weekDays.map((d) => {
                    const key = `${s.id}:${d}`;
                    const row = rowMap.get(key);
                    const label = templateLabel(row);
                    const isOpen = activeCell?.staffId === s.id && activeCell.date === d;
                    return (
                      <td key={d} className="px-0.5 py-1 align-top">
                        <button
                          type="button"
                          onClick={() => setActiveCell(isOpen ? null : { staffId: s.id, date: d })}
                          className={`w-full min-h-[44px] rounded-md px-1 py-1 text-center leading-tight ${
                            row?.is_off_day
                              ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800"
                              : label
                                ? "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100"
                                : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900"
                          } ${isOpen ? "ring-2 ring-blue-500" : ""}`}
                        >
                          {label || "—"}
                        </button>
                        {isOpen ? (
                          <div className="mt-1 space-y-1 rounded border border-zinc-200 bg-white p-1.5 dark:border-zinc-700 dark:bg-zinc-950">
                            <select
                              className="w-full rounded border border-zinc-300 px-1 py-0.5 text-[11px] dark:border-zinc-600 dark:bg-zinc-900"
                              defaultValue=""
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "__off__") void assign(s.id, d, { is_off_day: true });
                                else if (v === "__clear__") void assign(s.id, d, { is_off_day: true });
                                else if (v) void assign(s.id, d, { template_id: v });
                              }}
                            >
                              <option value="">Assign…</option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} {t.start_time}–{t.end_time}
                                </option>
                              ))}
                              <option value="__off__">Mark OFF</option>
                            </select>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-zinc-300 p-2 dark:border-zinc-700">
        <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">Bulk assign selected staff</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
            Date
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[11px] text-zinc-500">
            Shift template
            <select
              value={bulkTemplateId}
              onChange={(e) => setBulkTemplateId(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.start_time}–{t.end_time}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void bulkAssign(false)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Assign shift
          </button>
          <button
            type="button"
            onClick={() => void bulkAssign(true)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold dark:border-zinc-600"
          >
            Mark OFF
          </button>
        </div>
      </div>
    </div>
  );
}

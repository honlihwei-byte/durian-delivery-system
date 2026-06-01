"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HelpInfoIcon } from "@/components/help/HelpInfoIcon";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import { EditShiftsModal, type ScheduleRow } from "./EditShiftsModal";
import type { ShopShiftTemplate } from "./ShopShiftTemplatesPanel";

type Staff = { id: string; staff_name: string; staff_code: string };

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

function formatCellShifts(shifts: ScheduleRow[]): { lines: string[]; more: number; isOff: boolean } {
  const active = shifts.filter((s) => s.status === "active");
  if (active.some((s) => s.is_off_day)) return { lines: ["OFF"], more: 0, isOff: true };
  const timed = active
    .filter((s) => s.start_time && s.end_time)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  const lines = timed.slice(0, 2).map((s) => `${s.start_time}–${s.end_time}`);
  const more = Math.max(0, timed.length - 2);
  return { lines, more, isOff: false };
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
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    staffId: string;
    staffName: string;
    date: string;
  } | null>(null);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6]!;

  const cellMap = useMemo(() => {
    const m = new Map<string, ScheduleRow[]>();
    for (const r of rows) {
      if (r.status !== "active") continue;
      const key = `${r.staff_id}:${r.shift_date}`;
      const list = m.get(key) ?? [];
      list.push(r);
      m.set(key, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => String(a.start_time ?? "").localeCompare(String(b.start_time ?? "")));
    }
    return m;
  }, [rows]);

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

  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<{ shopId?: string }>;
      if (!e.detail?.shopId || e.detail.shopId !== shopId) return;
      void load();
    };
    window.addEventListener("opsflow:templatesUpdated", handler as EventListener);
    return () => window.removeEventListener("opsflow:templatesUpdated", handler as EventListener);
  }, [shopId, load]);

  async function postSchedule(
    staffId: string,
    date: string,
    body: Record<string, unknown>,
  ): Promise<ScheduleRow> {
    const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/staff-schedule`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staffId, shift_date: date, ...body }),
    });
    if (!res.ok) throw new Error(await readErr(res));
    const j = (await res.json()) as { row?: ScheduleRow };
    if (!j.row) throw new Error("No row returned");
    return j.row;
  }

  async function assignFirst(staffId: string, date: string, body: Record<string, unknown>) {
    const cellKey = `${staffId}:${date}`;
    setError(null);
    setSavingCellKey(cellKey);
    try {
      const saved = await postSchedule(staffId, date, body);
      setRows((curr) => {
        const next = curr.filter(
          (r) => !(r.staff_id === staffId && r.shift_date === date && r.status === "active"),
        );
        next.push(saved);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setSavingCellKey((k) => (k === cellKey ? null : k));
    }
  }

  async function addShift(staffId: string, date: string, templateId: string) {
    const cellKey = `${staffId}:${date}`;
    setError(null);
    setSavingCellKey(cellKey);
    try {
      const saved = await postSchedule(staffId, date, { template_id: templateId, add_shift: true });
      setRows((curr) => [...curr, saved]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add shift");
    } finally {
      setSavingCellKey((k) => (k === cellKey ? null : k));
    }
  }

  async function deleteShift(scheduleId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/shops/${encodeURIComponent(shopId)}/staff-schedule/${encodeURIComponent(scheduleId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error(await readErr(res));
      setRows((curr) => curr.filter((r) => r.id !== scheduleId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete shift");
    }
  }

  async function markOff(staffId: string, date: string) {
    await assignFirst(staffId, date, { is_off_day: true });
  }

  async function addShiftFromModal(staffId: string, date: string, templateId: string) {
    const cellShifts = cellMap.get(`${staffId}:${date}`) ?? [];
    const isOff = cellShifts.some((r) => r.status === "active" && r.is_off_day);
    const hasTimedShifts = cellShifts.some(
      (r) => r.status === "active" && !r.is_off_day && r.start_time && r.end_time,
    );
    if (isOff || !hasTimedShifts) {
      await assignFirst(staffId, date, { template_id: templateId });
    } else {
      await addShift(staffId, date, templateId);
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

  const modalShifts = editModal
    ? (cellMap.get(`${editModal.staffId}:${editModal.date}`) ?? [])
    : [];

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Staff schedule
          </p>
          <p className="text-xs text-zinc-500">
            Click a cell to assign or edit shifts · multiple shifts per day supported
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
        <p className="text-sm text-zinc-500">
          No punch-authorized staff assigned to this shop.
          <HelpInfoIcon helpKey="authorizedStaff" />
        </p>
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
                    const cellShifts = cellMap.get(key) ?? [];
                    const { lines, more, isOff } = formatCellShifts(cellShifts);
                    const hasShifts = cellShifts.length > 0;
                    return (
                      <td key={d} className="px-0.5 py-1 align-top">
                        <button
                          type="button"
                          onClick={() =>
                            setEditModal({
                              staffId: s.id,
                              staffName: s.staff_name,
                              date: d,
                            })
                          }
                          className={`w-full min-h-[44px] rounded-md px-1 py-1 text-center leading-tight ${
                            isOff
                              ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800"
                              : hasShifts
                                ? "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100"
                                : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900"
                          }`}
                        >
                          {hasShifts ? (
                            <div className="font-mono text-[10px] font-semibold leading-snug">
                              {lines.map((line) => (
                                <div key={line}>{line}</div>
                              ))}
                              {more > 0 ? <div className="opacity-80">+{more} more</div> : null}
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                          {savingCellKey === key ? (
                            <div className="mt-0.5 text-[10px] opacity-80">Saving…</div>
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditShiftsModal
        open={editModal != null}
        staffName={editModal?.staffName ?? ""}
        date={editModal?.date ?? ""}
        shifts={modalShifts}
        templates={templates}
        busy={savingCellKey != null}
        onClose={() => setEditModal(null)}
        onAddShift={(templateId) => {
          if (!editModal) return;
          void addShiftFromModal(editModal.staffId, editModal.date, templateId);
        }}
        onMarkOff={() => {
          if (editModal) void markOff(editModal.staffId, editModal.date);
        }}
        onDelete={(id) => void deleteShift(id)}
      />

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
            <span>
              Shift template
              <HelpInfoIcon helpKey="shiftTemplate" />
            </span>
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

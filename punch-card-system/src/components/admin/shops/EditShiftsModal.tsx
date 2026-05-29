"use client";

import type { ShopShiftTemplate } from "./ShopShiftTemplatesPanel";

export type ScheduleRow = {
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

function formatShiftLine(r: ScheduleRow): string {
  if (r.is_off_day) return "OFF";
  if (r.start_time && r.end_time) return `${r.start_time}–${r.end_time}`;
  return "—";
}

export function EditShiftsModal({
  open,
  staffName,
  date,
  shifts,
  templates,
  busy,
  onClose,
  onAddShift,
  onMarkOff,
  onDelete,
}: {
  open: boolean;
  staffName: string;
  date: string;
  shifts: ScheduleRow[];
  templates: ShopShiftTemplate[];
  busy: boolean;
  onClose: () => void;
  onAddShift: (templateId: string) => void;
  onMarkOff: () => void;
  onDelete: (scheduleId: string) => void;
}) {
  if (!open) return null;

  const active = shifts.filter((s) => s.status === "active");
  const off = active.some((s) => s.is_off_day);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Edit shifts</p>
            <p className="text-xs text-zinc-500">
              {staffName} · {date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold dark:border-zinc-600"
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-auto p-4">
          {off ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Marked OFF for this day.</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-zinc-500">No shifts yet. Choose a template below.</p>
          ) : (
            active.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <div>
                  <p className="text-xs font-semibold text-zinc-500">Shift {idx + 1}</p>
                  <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatShiftLine(s)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDelete(s.id)}
                  className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
                >
                  Delete
                </button>
              </div>
            ))
          )}

          {!off ? (
            <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {active.length === 0 ? "Assign shift" : "+ Add another shift"}
              </p>
              <select
                className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                defaultValue=""
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    onAddShift(v);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Choose template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.start_time}–{t.end_time}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={onMarkOff}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-600"
          >
            Mark OFF (replaces all shifts)
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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

function formatShiftLine(r: ScheduleRow, templates: ShopShiftTemplate[]): string {
  if (r.is_off_day) return "OFF";
  if (r.start_time && r.end_time) {
    const tpl = templates.find((t) => t.id === r.template_id);
    const label = tpl?.name ? `${tpl.name} · ` : "";
    return `${label}${r.start_time}–${r.end_time}`;
  }
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
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    if (!open) return;
    if (templates.length === 0) {
      setSelectedTemplateId("");
      return;
    }
    setSelectedTemplateId((prev) =>
      prev && templates.some((t) => t.id === prev) ? prev : templates[0]!.id,
    );
  }, [open, templates]);

  if (!open) return null;

  const active = shifts.filter((s) => s.status === "active");
  const isOff = active.some((s) => s.is_off_day);
  const timedShifts = active.filter((s) => !s.is_off_day && s.start_time && s.end_time);

  function handleAdd() {
    if (!selectedTemplateId || busy) return;
    onAddShift(selectedTemplateId);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Edit shifts</p>
          <p className="text-xs text-zinc-500">
            {staffName} · {date}
          </p>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-auto p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Current status</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                isOff ? "text-zinc-700 dark:text-zinc-300" : "text-sky-800 dark:text-sky-200"
              }`}
            >
              {isOff ? "OFF day" : timedShifts.length > 0 ? `${timedShifts.length} shift(s)` : "No shift assigned"}
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Assign shift</p>
            {templates.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                No shift templates yet. Add templates under Schedule → shift templates for this shop.
              </p>
            ) : (
              <>
                <select
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  value={selectedTemplateId}
                  disabled={busy}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.start_time}–{t.end_time})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !selectedTemplateId}
                  onClick={handleAdd}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : timedShifts.length > 0 ? "Add shift" : "Assign shift"}
                </button>
                {isOff ? (
                  <p className="text-[11px] text-zinc-500">
                    Assigning a shift removes the OFF day automatically.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Existing shifts</p>
            {timedShifts.length === 0 ? (
              <p className="text-sm text-zinc-500">No shifts assigned.</p>
            ) : (
              <ul className="space-y-2">
                {timedShifts.map((s, idx) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">Shift {idx + 1}</p>
                      <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatShiftLine(s, templates)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDelete(s.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onMarkOff}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
          >
            Mark OFF
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { formatTemplate } from "@/lib/i18n/format-template";
import type { OtherShopAssignment } from "@/lib/shifts/schedule-cell-status";
import type { ShopShiftTemplate } from "./ShopShiftTemplatesPanel";

const OFF_VALUE = "__off__";

export function ScheduleCellPicker({
  open,
  currentValue,
  otherAssignments,
  templates,
  busy,
  onSelect,
  onClose,
}: {
  open: boolean;
  currentValue: string;
  otherAssignments: OtherShopAssignment[];
  templates: ShopShiftTemplate[];
  busy: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-0 z-20 min-w-[140px] max-w-[200px] rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-950"
    >
      {otherAssignments.length > 0 ? (
        <div className="border-b border-amber-200 bg-amber-50 px-2 py-1.5 dark:border-amber-900 dark:bg-amber-950/50">
          <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200">
            {t("shops.editForm.staffSchedule.alreadyAssigned")}
          </p>
          {otherAssignments.map((a) => (
            <p key={`${a.shop_id}:${a.start_time}`} className="text-[10px] text-amber-900 dark:text-amber-100">
              {a.shop_name}
              <br />
              {a.start_time}–{a.end_time}
            </p>
          ))}
        </div>
      ) : null}

      <div className="max-h-[220px] overflow-y-auto p-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect(OFF_VALUE)}
          className={`block w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
            currentValue === OFF_VALUE ? "bg-sky-50 text-sky-900 dark:bg-sky-950/50" : ""
          }`}
        >
          {t("shops.editForm.staffSchedule.offDayLabel")}
        </button>
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            disabled={busy}
            onClick={() => onSelect(tpl.id)}
            className={`block w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              currentValue === tpl.id ? "bg-sky-50 font-semibold text-sky-900 dark:bg-sky-950/50" : ""
            }`}
          >
            {tpl.name}
            <span className="block text-[10px] font-normal opacity-75">
              {tpl.start_time}–{tpl.end_time}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { OFF_VALUE };

export function crossShopConfirmMessage(
  t: (key: string) => string,
  other: OtherShopAssignment,
): string {
  return formatTemplate(t("shops.editForm.staffSchedule.crossShopConfirm"), {
    shop: other.shop_name,
    start: other.start_time,
    end: other.end_time,
  });
}

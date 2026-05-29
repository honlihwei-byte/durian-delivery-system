"use client";

import { HelpInfoIcon } from "@/components/help/HelpInfoIcon";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function PhotoProofFallbackField({ checked, onChange, disabled }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-3 dark:border-violet-900 dark:bg-violet-950/30">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 text-sm">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          Allow Photo Proof Fallback
          <HelpInfoIcon helpKey="photoProofFallback" />
        </span>
        <span className="mt-1 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
          Requires Indoor Confidence Mode. After 3 failed indoor GPS rounds, staff may use a live
          camera photo (review required). Default off.
        </span>
      </span>
    </label>
  );
}

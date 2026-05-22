"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function IndoorConfidenceModeField({ checked, onChange, disabled }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 text-sm">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          Enable Indoor Confidence Mode
        </span>
        <span className="mt-1 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
          Off (default): fast GPS, original radius only — for street shops and normal retail.
          On: confidence scoring, multi-sample GPS, indoor fallback — for high-rise, malls, and
          weak indoor GPS.
        </span>
      </span>
    </label>
  );
}

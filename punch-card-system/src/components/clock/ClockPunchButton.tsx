"use client";

import { useCallback, useState } from "react";

function PunchSpinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden
    />
  );
}

export function ClockPunchButton({
  label,
  processingLabel = "Processing…",
  isClockIn,
  disabled,
  isSubmitting,
  onPunch,
}: {
  label: string;
  processingLabel?: string;
  isClockIn: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  onPunch: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const canInteract = !disabled && !isSubmitting;

  const setPressedSafe = useCallback(
    (value: boolean) => {
      if (!canInteract && value) return;
      setPressed(value);
    },
    [canInteract],
  );

  const baseColor = isClockIn
    ? "bg-emerald-600 ring-emerald-300 dark:ring-emerald-600"
    : "bg-red-600 ring-red-300 dark:bg-red-700 dark:ring-red-800";

  return (
    <button
      type="button"
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting}
      onPointerDown={() => setPressedSafe(true)}
      onPointerUp={() => setPressedSafe(false)}
      onPointerLeave={() => setPressedSafe(false)}
      onPointerCancel={() => setPressedSafe(false)}
      onTouchStart={() => setPressedSafe(true)}
      onTouchEnd={() => setPressedSafe(false)}
      onTouchCancel={() => setPressedSafe(false)}
      onClick={() => {
        if (!canInteract) return;
        onPunch();
      }}
      className={[
        "w-full select-none rounded-xl py-4 text-lg font-semibold text-white shadow-sm",
        "touch-manipulation transition-[transform,opacity,box-shadow] duration-75",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        baseColor,
        canInteract && !pressed ? "ring-4" : "",
        pressed && canInteract ? "scale-[0.97] opacity-90" : "",
        isSubmitting ? "scale-[0.99] opacity-95" : "",
      ].join(" ")}
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2.5">
          <PunchSpinner />
          <span>{processingLabel}</span>
        </span>
      ) : (
        label
      )}
    </button>
  );
}

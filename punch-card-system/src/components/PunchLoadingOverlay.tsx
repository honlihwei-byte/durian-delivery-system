"use client";

export function PunchLoadingOverlay({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl bg-white px-6 py-8 shadow-xl dark:bg-zinc-900">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600 dark:border-zinc-700 dark:border-t-emerald-500"
          aria-hidden
        />
        <p className="text-center text-sm font-medium text-zinc-800 dark:text-zinc-100">{message}</p>
      </div>
    </div>
  );
}


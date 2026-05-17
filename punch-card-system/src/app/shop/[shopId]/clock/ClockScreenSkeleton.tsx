export function ClockScreenSkeleton({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:py-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Clock</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{message}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Please wait…</p>
      </header>
      <div className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

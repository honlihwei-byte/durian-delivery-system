import Link from "next/link";

export function MarketingShell({
  children,
  narrow,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Punch Card System
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Company Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Start trial
            </Link>
          </nav>
        </div>
      </header>
      <main className={`mx-auto px-4 py-10 sm:px-6 ${narrow ? "max-w-lg" : "max-w-6xl"}`}>
        {children}
      </main>
    </div>
  );
}

export function btnPrimary(className = "") {
  return `inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 ${className}`;
}

export function btnSecondary(className = "") {
  return `inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-center text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 ${className}`;
}

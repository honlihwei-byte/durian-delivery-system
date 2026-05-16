import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Multi-shop attendance</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">Staff clock in / out</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Each shop has a clock QR. After scanning it, staff enter their code or ID card QR, then clock in or out.
          Records include which shop they used.
        </p>
      </div>
      <nav className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Attendance dashboard
        </Link>
        <Link
          href="/admin/shops"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-center text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
        >
          Shop QR codes
        </Link>
        <Link
          href="/admin/staff"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-center text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
        >
          Staff
        </Link>
      </nav>
      <p className="text-xs text-zinc-500">
        Run <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">supabase/schema.sql</code> then{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">supabase/seed.sql</code> in Supabase, set{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">.env.local</code>, and start the app.
      </p>
    </main>
  );
}

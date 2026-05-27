import Link from "next/link";

export function MarketingShell({
  children,
  narrow,
  hideFooter,
}: {
  children: React.ReactNode;
  narrow?: boolean;
  hideFooter?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-xs font-bold text-white">
              OF
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-[#0F172A]">LW OpsFlow</span>
              <span className="block text-[11px] font-medium text-[#64748B]">OpsFlow Attendance</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-[#64748B] transition hover:bg-slate-100 hover:text-[#0F172A] sm:inline-flex"
            >
              Company Login
            </Link>
            <Link href="/register" className={btnPrimary("px-4 py-2 text-sm")}>
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <main className={`mx-auto px-4 py-8 sm:px-6 sm:py-12 ${narrow ? "max-w-lg" : "max-w-6xl"}`}>
        {children}
      </main>

      {!hideFooter ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-bold text-[#0F172A]">LW OpsFlow</p>
              <p className="mt-1 max-w-xs text-sm text-[#64748B]">
                Smart workforce systems for SMEs.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#64748B]">
              <a href="#features" className="hover:text-[#2563EB]">
                Features
              </a>
              <a href="#pricing" className="hover:text-[#2563EB]">
                Pricing
              </a>
              <a href="mailto:hello@lwopsflow.com" className="hover:text-[#2563EB]">
                Contact
              </a>
              <a href="#" className="hover:text-[#2563EB]">
                Privacy Policy
              </a>
            </nav>
          </div>
          <div className="border-t border-slate-200 py-4 text-center text-xs text-[#64748B]">
            © {new Date().getFullYear()} LW OpsFlow. All rights reserved.
          </div>
        </footer>
      ) : null}
    </div>
  );
}

export function btnPrimary(className = "") {
  return `inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-[#2563EB] px-6 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${className}`;
}

export function btnSecondary(className = "") {
  return `inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-center text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 ${className}`;
}

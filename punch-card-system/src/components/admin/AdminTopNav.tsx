"use client";

import { useCallback, useEffect, useState } from "react";

type NavSession = {
  role: "super_admin" | "company_admin";
  feature_access?: "full" | "billing_only" | "blocked";
  company?: { name: string; code: string; status_label?: string };
};

type Props = {
  session: NavSession;
  onLogout: () => void;
};

function NavButton({
  href,
  children,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const cls =
    "inline-flex shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function AdminTopNav({ session, onLogout }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [session.role, session.company?.name]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const showDashboard = session.role === "company_admin" && session.feature_access === "full";
  const showBilling = session.role === "company_admin";
  const showPlatform = session.role === "super_admin";

  const navItems = (
    <>
      {showBilling ? <NavButton href="/billing" onClick={closeMobile}>Billing</NavButton> : null}
      {showDashboard ? <NavButton href="/admin" onClick={closeMobile}>Dashboard</NavButton> : null}
      {showPlatform ? <NavButton href="/super-admin" onClick={closeMobile}>Platform</NavButton> : null}
      <NavButton
        onClick={() => {
          closeMobile();
          onLogout();
        }}
      >
        Logout
      </NavButton>
    </>
  );

  const logoHref = session.role === "super_admin" ? "/super-admin" : showDashboard ? "/admin" : "/billing";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        {/* Left: logo / system name */}
        <div className="flex min-w-0 max-w-[200px] shrink-0 items-center overflow-hidden sm:max-w-none">
          <a href={logoHref} className="min-w-0 truncate leading-tight">
            <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">
              LW OpsFlow
            </span>
            <span className="block truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              OpsFlow Attendance
            </span>
          </a>
        </div>

        {/* Center: company / role badges */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 overflow-hidden">
          {session.role === "company_admin" && session.company ? (
            <>
              <span
                className="max-w-[180px] truncate rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100 sm:max-w-[240px]"
                title={session.company.name}
              >
                {session.company.name}
              </span>
              <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                Company Admin
              </span>
              {session.company.status_label ? (
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-900 dark:bg-green-950 dark:text-green-100">
                  {session.company.status_label}
                </span>
              ) : null}
            </>
          ) : (
            <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900 dark:bg-violet-950 dark:text-violet-100">
              Super Admin
            </span>
          )}
        </div>

        {/* Right: desktop nav */}
        <nav
          className="hidden min-w-0 flex-wrap items-center justify-end gap-2 lg:flex"
          aria-label="Admin navigation"
        >
          {navItems}
        </nav>

        {/* Mobile / medium: hamburger */}
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 lg:hidden dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span aria-hidden="true">☰</span> Menu
        </button>
      </div>

      {/* Mobile / medium dropdown */}
      {mobileOpen ? (
        <nav
          id="admin-mobile-menu"
          className="mx-auto mt-3 flex max-w-7xl flex-col gap-2 border-t border-zinc-100 pt-3 lg:hidden dark:border-zinc-800"
          aria-label="Admin mobile navigation"
        >
          {navItems}
        </nav>
      ) : null}
    </header>
  );
}

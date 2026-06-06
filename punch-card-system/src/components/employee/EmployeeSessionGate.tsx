"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import Link from "next/link";

type SessionInfo = {
  authenticated: boolean;
  staff_id?: string;
  staff_name?: string;
  company_name?: string;
  role_template?: string;
};

export function EmployeeSessionGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/employee/auth/session", { credentials: "include" });
    const j = (await res.json()) as SessionInfo;
    setSession(j);
    setReady(true);
    if (j.authenticated) {
      const nRes = await fetch("/api/employee/notifications", { credentials: "include" });
      if (nRes.ok) {
        const nj = (await nRes.json()) as { unread?: number };
        setUnread(nj.unread ?? 0);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ready || session?.authenticated) return;
    const next = encodeURIComponent(pathname);
    router.replace(`/employee/login?next=${next}`);
  }, [ready, session?.authenticated, router, pathname]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/employee/auth/logout", { method: "POST", credentials: "include" });
    router.push("/employee/login");
  }, [router]);

  if (!ready) {
    return <p className="p-6 text-sm text-zinc-500">{t("employee.dashboard.loading")}</p>;
  }

  if (!session?.authenticated) return null;

  const nav = [
    { href: "/employee/dashboard", label: t("employee.nav.dashboard") },
    { href: "/employee/tasks", label: t("employee.nav.tasks") },
    { href: "/employee/attendance", label: t("employee.nav.attendance") },
    {
      href: "/employee/notifications",
      label: t("employee.nav.notifications"),
      badge: unread,
    },
    { href: "/employee/clock", label: t("employee.nav.clock") },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {session.staff_name}
            </p>
            <p className="text-xs text-zinc-500">{session.company_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
            >
              {t("employee.nav.logout")}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                pathname.startsWith(item.href)
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
              ].join(" ")}
            >
              {item.label}
              {item.badge ? ` (${item.badge})` : ""}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
    </div>
  );
}

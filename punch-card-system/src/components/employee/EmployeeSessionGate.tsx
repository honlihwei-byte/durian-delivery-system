"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { isEmployeeAppHost } from "@/lib/app-url";
import Link from "next/link";
import {
  EmployeePermissionProvider,
  useEmployeePermissions,
} from "@/components/employee/EmployeePermissionProvider";

function EmployeeShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { session, ready, navItems, refresh } = useEmployeePermissions();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!session?.authenticated) return;
    void fetch("/api/employee/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { unread?: number }) => setUnread(j.unread ?? 0))
      .catch(() => {});
  }, [session?.authenticated, pathname]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/employee/auth/logout", { method: "POST", credentials: "include" });
    const loginPath =
      typeof window !== "undefined" && isEmployeeAppHost(window.location.host)
        ? "/login"
        : "/employee/login";
    router.push(loginPath);
  }, [router]);

  if (!ready) {
    return <p className="p-6 text-sm text-zinc-500">{t("employee.dashboard.loading")}</p>;
  }

  if (!session?.authenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {session.staff_name}
            </p>
            {session.position_name ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("positions.positionLabel")}: {session.position_name}
              </p>
            ) : null}
            {session.assigned_shops && session.assigned_shops.length > 0 ? (
              <p className="text-xs text-zinc-500">
                {t("employee.profile.assignedShops")}:{" "}
                {session.assigned_shops.map((s) => s.name).join(", ")}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs text-zinc-500 underline"
              title="Refresh permissions"
            >
              ↻
            </button>
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
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                item.match(pathname)
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
              ].join(" ")}
            >
              {t(item.labelKey)}
              {item.id === "notifications" && unread > 0 ? ` (${unread})` : ""}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
    </div>
  );
}

function EmployeeSessionGateInner({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const { session, ready } = useEmployeePermissions();

  useEffect(() => {
    if (!ready || session?.authenticated) return;
    const next = encodeURIComponent(pathname);
    const loginPath =
      typeof window !== "undefined" && isEmployeeAppHost(window.location.host)
        ? "/login"
        : "/employee/login";
    router.replace(`${loginPath}?next=${next}`);
  }, [ready, session?.authenticated, router, pathname]);

  if (!ready || !session?.authenticated) {
    return null;
  }

  return <EmployeeShell>{children}</EmployeeShell>;
}

export function EmployeeSessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <EmployeePermissionProvider>
      <EmployeeSessionGateInner pathname={pathname}>{children}</EmployeeSessionGateInner>
    </EmployeePermissionProvider>
  );
}

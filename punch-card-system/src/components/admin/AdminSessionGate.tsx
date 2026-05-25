"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminLoginForm } from "./AdminLoginForm";

type SessionInfo = {
  authenticated: boolean;
  role?: "super_admin" | "company_admin";
  role_label?: string;
  company?: { name: string; code: string; status_label?: string };
};

type Props = {
  children: React.ReactNode;
  requiredRole?: "company_admin" | "super_admin";
};

export function AdminSessionGate({ children, requiredRole = "company_admin" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/auth/session", { credentials: "include" });
    const j = (await res.json()) as SessionInfo;
    setSession(j);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    setSession({ authenticated: false });
    router.push("/admin/login");
  }, [router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <AdminLoginForm
        defaultRedirect={pathname.startsWith("/super-admin") ? "/super-admin" : "/admin"}
        onSuccess={() => void refresh()}
      />
    );
  }

  if (requiredRole === "super_admin" && session.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600">Super Admin access required.</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() => router.push("/admin/login")}
        >
          Sign in
        </button>
      </div>
    );
  }

  if (requiredRole === "company_admin" && session.role !== "company_admin") {
    router.replace("/super-admin");
    return null;
  }

  return (
    <div className="relative">
      <div className="fixed right-4 top-4 z-50 flex flex-wrap items-center justify-end gap-2 sm:right-6 sm:top-6">
        {session.role === "company_admin" && session.company ? (
          <span className="rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200">
            {session.company.name}
            <span className="mx-1 text-zinc-400">·</span>
            Company Admin
            {session.company.status_label ? (
              <span className="ml-1 text-zinc-500">({session.company.status_label})</span>
            ) : null}
          </span>
        ) : (
          <span className="rounded-lg border border-violet-200 bg-violet-50/95 px-3 py-2 text-xs font-semibold text-violet-900 shadow-sm dark:border-violet-900 dark:bg-violet-950/80 dark:text-violet-100">
            Super Admin
          </span>
        )}
        {session.role === "super_admin" ? (
          <a
            href="/super-admin"
            className="rounded-lg border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100"
          >
            Platform
          </a>
        ) : (
          <a
            href="/admin"
            className="rounded-lg border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100"
          >
            Dashboard
          </a>
        )}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="rounded-lg border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100"
        >
          Log out
        </button>
      </div>
      {children}
    </div>
  );
}

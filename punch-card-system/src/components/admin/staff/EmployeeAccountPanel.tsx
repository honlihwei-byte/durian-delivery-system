"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";

type Account = {
  id: string;
  login_email: string | null;
  login_phone: string | null;
  status: "active" | "inactive";
};

export function EmployeeAccountPanel({ staffId }: { staffId: string }) {
  const { t } = useI18n();
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}/employee-account`, {
      credentials: "include",
    });
    if (res.ok) {
      const j = (await res.json()) as { account?: Account | null };
      setAccount(j.account ?? null);
      if (j.account) {
        setEmail(j.account.login_email ?? "");
        setPhone(j.account.login_phone ?? "");
      }
    } else {
      setAccount(null);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAccount() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}/employee-account`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_email: email || null, login_phone: phone || null, password }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg(t("employee.account.saved"));
      setPassword("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchAccount(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}/employee-account`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg(t("employee.account.saved"));
      setPassword("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (account === undefined) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
        {t("employee.account.title")}
      </p>
      {msg ? <p className="text-xs text-emerald-700">{msg}</p> : null}

      {!account ? (
        <>
          <p className="text-[11px] text-zinc-600">{t("employee.account.none")}</p>
          <label className="block text-xs">
            {t("employee.account.email")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            {t("employee.account.phone")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            {t("employee.account.password")}
            <input
              type="password"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createAccount()}
            className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
          >
            {busy ? t("employee.account.saving") : t("employee.account.create")}
          </button>
        </>
      ) : (
        <>
          <p className="text-[11px] text-zinc-600">
            {account.status === "active"
              ? t("employee.account.statusActive")
              : t("employee.account.statusInactive")}
            {account.login_email ? ` · ${account.login_email}` : ""}
            {account.login_phone ? ` · ${account.login_phone}` : ""}
          </p>
          <label className="block text-xs">
            {t("employee.account.password")}
            <input
              type="password"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {password ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void patchAccount({ password })}
                className="rounded border px-2 py-1 text-xs font-semibold"
              >
                {t("employee.account.resetPassword")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void patchAccount({
                  status: account.status === "active" ? "inactive" : "active",
                })
              }
              className="rounded border px-2 py-1 text-xs font-semibold"
            >
              {account.status === "active"
                ? t("employee.account.deactivate")
                : t("employee.account.activate")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

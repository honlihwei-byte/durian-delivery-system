"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";

type Account = {
  id: string;
  login_email: string | null;
  login_phone: string | null;
  status: "pending_activation" | "active" | "disabled";
  has_password: boolean;
  activation_sent_at: string | null;
  activation_token_expires_at: string | null;
};

export function EmployeeAccountPanel({ staffId }: { staffId: string }) {
  const { t } = useI18n();
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function runAction(action: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setMsg(null);
    setActivationUrl(null);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}/employee-account`, {
        method: account ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account ? { action, ...body } : { login_email: email || null, login_phone: phone || null }),
      });
      const j = (await res.json()) as {
        error?: string;
        activation_url?: string;
        account?: Account;
      };
      if (!res.ok) throw new Error(j.error || "Failed");
      if (j.activation_url) setActivationUrl(j.activation_url);
      setMsg(t("employee.account.saved"));
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyActivationLink() {
    if (!activationUrl) return;
    try {
      await navigator.clipboard.writeText(activationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg(t("employee.account.copyFailed"));
    }
  }

  function statusLabel(status: Account["status"]): string {
    if (status === "pending_activation") return t("employee.account.statusPending");
    if (status === "disabled") return t("employee.account.statusDisabled");
    return t("employee.account.statusActive");
  }

  if (account === undefined) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
        {t("employee.account.title")}
      </p>
      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{t("employee.account.adminHint")}</p>
      {msg ? <p className="text-xs text-emerald-700 dark:text-emerald-300">{msg}</p> : null}

      {!account ? (
        <>
          <p className="text-[11px] text-zinc-600">{t("employee.account.none")}</p>
          <label className="block text-xs">
            {t("employee.account.email")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            {t("employee.account.phone")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction("create")}
            className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
          >
            {busy ? t("employee.account.saving") : t("employee.account.createLogin")}
          </button>
        </>
      ) : (
        <>
          <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            {statusLabel(account.status)}
            {account.login_email ? ` · ${account.login_email}` : ""}
            {account.login_phone ? ` · ${account.login_phone}` : ""}
          </p>

          {activationUrl ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] dark:border-amber-900 dark:bg-amber-950/30">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                {t("employee.account.activationLink")}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-amber-800 dark:text-amber-200">
                {activationUrl}
              </p>
              <button
                type="button"
                onClick={() => void copyActivationLink()}
                className="mt-2 rounded border border-amber-300 px-2 py-0.5 text-xs font-semibold dark:border-amber-800"
              >
                {copied ? t("employee.account.copied") : t("employee.account.copyLink")}
              </button>
              <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                {t("employee.account.activationHint")}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {account.status === "pending_activation" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction("resend_activation")}
                className="rounded border px-2 py-1 text-xs font-semibold dark:border-zinc-600"
              >
                {t("employee.account.resendActivation")}
              </button>
            ) : null}
            {account.status === "active" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction("reset_password")}
                className="rounded border px-2 py-1 text-xs font-semibold dark:border-zinc-600"
              >
                {t("employee.account.resetPassword")}
              </button>
            ) : null}
            {account.status === "disabled" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction("enable")}
                className="rounded border px-2 py-1 text-xs font-semibold dark:border-zinc-600"
              >
                {t("employee.account.enableLogin")}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction("disable")}
                className="rounded border px-2 py-1 text-xs font-semibold dark:border-zinc-600"
              >
                {t("employee.account.disableLogin")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

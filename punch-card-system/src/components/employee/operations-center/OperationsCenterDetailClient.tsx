"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { OperationsContentDetail, OperationsContentType } from "@/lib/operations-center/types";

type Detail = OperationsContentDetail & { is_read: boolean; is_acknowledged: boolean };

function typeLabel(t: (key: string) => string, type: OperationsContentType): string {
  return t(`operationsCenter.types.${type}`);
}

export function OperationsCenterDetailClient() {
  const { t } = useI18n();
  const params = useParams();
  const contentId = String(params.id ?? "");
  const [item, setItem] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [ackBusy, setAckBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employee/operations-center/${contentId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("operationsCenter.employee.loadFailed"));
        return;
      }
      const j = (await res.json()) as { item?: Detail };
      setItem(j.item ?? null);
    } finally {
      setLoading(false);
    }
  }, [contentId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acknowledge() {
    setAckBusy(true);
    try {
      const res = await fetch(`/api/employee/operations-center/${contentId}/acknowledge`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError(t("operationsCenter.employee.loadFailed"));
        return;
      }
      await load();
    } finally {
      setAckBusy(false);
    }
  }

  if (loading) {
    return <p className="text-base text-zinc-500">{t("common.loading")}</p>;
  }

  if (error || !item) {
    return (
      <div className="space-y-3">
        <p className="text-base text-red-600">{error ?? t("operationsCenter.employee.loadFailed")}</p>
        <Link href="/employee/operations-center" className="text-sm font-semibold text-violet-600">
          ← {t("operationsCenter.employee.viewAll")}
        </Link>
      </div>
    );
  }

  const needsAck = item.require_acknowledgement && !item.is_acknowledged;
  const pdf = item.attachments.find((a) => a.mime_type === "application/pdf");

  return (
    <div className="space-y-4 pb-24">
      <Link href="/employee/operations-center" className="text-sm font-semibold text-violet-600">
        ← {t("operationsCenter.employee.viewAll")}
      </Link>

      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
          {typeLabel(t, item.content_type)}
        </p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">{item.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{item.publish_date}</p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-800 dark:text-zinc-100">
          {item.description}
        </p>
      </section>

      {pdf?.preview_url ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {t("operationsCenter.employee.attachmentPreview")}
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
            <iframe
              title={pdf.file_name}
              src={pdf.preview_url}
              className="h-[70vh] w-full"
            />
          </div>
        </section>
      ) : null}

      {item.attachments
        .filter((a) => a.mime_type.startsWith("image/") && a.preview_url)
        .map((a) => (
          <img
            key={a.id}
            src={a.preview_url!}
            alt={a.file_name}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700"
          />
        ))}

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
        {needsAck ? (
          <button
            type="button"
            disabled={ackBusy}
            onClick={() => void acknowledge()}
            className="w-full rounded-xl bg-violet-600 py-4 text-base font-semibold text-white active:scale-[0.99] disabled:opacity-60"
          >
            {ackBusy ? t("operationsCenter.employee.acknowledging") : t("operationsCenter.employee.acknowledge")}
          </button>
        ) : (
          <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {item.require_acknowledgement
              ? t("operationsCenter.employee.acknowledged")
              : t("operationsCenter.employee.read")}
          </p>
        )}
      </div>
    </div>
  );
}

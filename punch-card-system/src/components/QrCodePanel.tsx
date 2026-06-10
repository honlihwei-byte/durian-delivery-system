"use client";

import QRCode from "react-qr-code";
import { useCallback, useMemo, useRef } from "react";
import {
  buildShopClockQrFilenameBase,
  sanitizeFilenamePart,
  splitShopCodeAndName,
} from "@/lib/qr-download-filename";

export type QrPrintLabels = {
  brand?: string;
  shopCode?: string;
  shopName?: string;
  actionLine?: string;
};

type QrCodePanelProps = {
  value: string;
  /** Pixel size of the QR module grid (library default). */
  size?: number;
  /** Used for download filenames (no extension). Overrides shop clock naming when set. */
  filenameBase?: string;
  /** Shop clock QR: builds `{shop_code}-{shop_name}-Clock-QR` when filenameBase is omitted. */
  shopCode?: string | null;
  shopName?: string;
  /** Optional heading for print window title. */
  printTitle?: string;
  /** Shop clock print layout (LW OpsFlow header). */
  printLabels?: QrPrintLabels;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function resolveFilenameBase(props: {
  filenameBase?: string;
  shopCode?: string | null;
  shopName?: string;
}): string {
  if (props.filenameBase?.trim()) {
    return sanitizeFilenamePart(props.filenameBase);
  }
  if (props.shopName?.trim()) {
    return buildShopClockQrFilenameBase({
      shopCode: props.shopCode,
      shopName: props.shopName,
    });
  }
  return "Clock-QR";
}

export function QrCodePanel({
  value,
  size = 200,
  filenameBase,
  shopCode,
  shopName,
  printTitle,
  printLabels,
}: QrCodePanelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const resolvedFilenameBase = useMemo(
    () => resolveFilenameBase({ filenameBase, shopCode, shopName }),
    [filenameBase, shopCode, shopName],
  );

  const resolvedPrintLabels = useMemo((): QrPrintLabels | null => {
    if (printLabels) return printLabels;
    if (!shopName?.trim()) return null;
    const { code, name } = splitShopCodeAndName(shopName, shopCode);
    return {
      brand: "LW OpsFlow",
      shopCode: code,
      shopName: name,
      actionLine: "Clock In / Clock Out",
    };
  }, [printLabels, shopCode, shopName]);

  const getSvg = () => wrapRef.current?.querySelector("svg");

  const downloadSvg = useCallback(() => {
    const svg = getSvg();
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resolvedFilenameBase}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resolvedFilenameBase]);

  const downloadPng = useCallback(() => {
    const svg = getSvg();
    if (!svg) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const scale = 2;
    const px = size * scale;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, px, px);
      ctx.drawImage(img, 0, 0, px, px);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => {
          if (!b) return;
          const a = document.createElement("a");
          const u = URL.createObjectURL(b);
          a.href = u;
          a.download = `${resolvedFilenameBase}.png`;
          a.click();
          URL.revokeObjectURL(u);
        },
        "image/png",
        1,
      );
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [resolvedFilenameBase, size]);

  const printQr = useCallback(() => {
    const svg = getSvg();
    if (!svg) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    const w = window.open("", "_blank", "width=440,height=560");
    if (!w) return;
    const title = escapeHtml(
      printTitle ||
        (resolvedPrintLabels
          ? `${resolvedPrintLabels.shopCode ? `${resolvedPrintLabels.shopCode} - ` : ""}${resolvedPrintLabels.shopName ?? "Clock QR"}`
          : "Clock QR"),
    );

    const header = resolvedPrintLabels
      ? `<div style="margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em">${escapeHtml(resolvedPrintLabels.brand ?? "LW OpsFlow")}</p>
          <p style="margin:0 0 6px;font-size:16px;font-weight:600">${escapeHtml(
            resolvedPrintLabels.shopCode
              ? `${resolvedPrintLabels.shopCode} - ${resolvedPrintLabels.shopName ?? ""}`
              : (resolvedPrintLabels.shopName ?? ""),
          )}</p>
          <p style="margin:0;font-size:14px;color:#374151">${escapeHtml(resolvedPrintLabels.actionLine ?? "Clock In / Clock Out")}</p>
        </div>`
      : "";

    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head><body style="margin:0;padding:24px;text-align:center;font-family:system-ui,sans-serif">${header}${svgStr}<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)})<\/script></body></html>`,
    );
    w.document.close();
  }, [printTitle, resolvedPrintLabels]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={wrapRef}
        className="inline-block rounded-lg border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-700"
      >
        <QRCode value={value} size={size} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadPng}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900"
        >
          Download QR
        </button>
        <button
          type="button"
          onClick={downloadSvg}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-600"
        >
          Download SVG
        </button>
        <button
          type="button"
          onClick={printQr}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold dark:border-zinc-600"
        >
          Print QR
        </button>
      </div>
    </div>
  );
}

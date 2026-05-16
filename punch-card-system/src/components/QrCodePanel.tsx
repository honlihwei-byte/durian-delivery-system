"use client";

import QRCode from "react-qr-code";
import { useCallback, useRef } from "react";

type QrCodePanelProps = {
  value: string;
  /** Pixel size of the QR module grid (library default). */
  size?: number;
  /** Used for download filenames (no extension). */
  filenameBase: string;
  /** Optional heading for print window title. */
  printTitle?: string;
};

function sanitizeFilePart(s: string) {
  return s.replace(/[^\w\-]+/g, "-").slice(0, 80) || "qr";
}

export function QrCodePanel({ value, size = 200, filenameBase, printTitle }: QrCodePanelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const getSvg = () => wrapRef.current?.querySelector("svg");

  const downloadSvg = useCallback(() => {
    const svg = getSvg();
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilePart(filenameBase)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filenameBase]);

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
          a.download = `${sanitizeFilePart(filenameBase)}.png`;
          a.click();
          URL.revokeObjectURL(u);
        },
        "image/png",
        1,
      );
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [filenameBase, size]);

  const printQr = useCallback(() => {
    const svg = getSvg();
    if (!svg) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    const w = window.open("", "_blank", "width=440,height=560");
    if (!w) return;
    const t = (printTitle || "QR").replace(/</g, "");
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${t}</title></head><body style="margin:0;padding:24px;text-align:center;font-family:system-ui,sans-serif">${svgStr}<p style="font-size:12px;word-break:break-all;margin-top:16px">${String(value).replace(/</g, "")}</p><script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)})<\/script></body></html>`,
    );
    w.document.close();
  }, [printTitle, value]);

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

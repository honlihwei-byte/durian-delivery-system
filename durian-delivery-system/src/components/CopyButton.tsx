"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyButton({
  text,
  label = "Copy Link",
  copiedLabel = "Copied!",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

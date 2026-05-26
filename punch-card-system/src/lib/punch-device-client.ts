/** Client-side browser fingerprint summary for punch audit. */
export function getPunchBrowserInfo(): string {
  if (typeof navigator === "undefined") return "unknown";
  const parts = [
    navigator.userAgent?.slice(0, 200) ?? "",
    navigator.language ?? "",
    typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "",
  ].filter(Boolean);
  return parts.join(" | ").slice(0, 500);
}

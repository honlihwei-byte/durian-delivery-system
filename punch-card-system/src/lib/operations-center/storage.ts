import { randomUUID } from "crypto";

export const OPERATIONS_CONTENT_BUCKET = "operations-content";
export const OPERATIONS_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const OPERATIONS_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const OPERATIONS_PREVIEWABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const SIGNED_PREVIEW_TTL_SEC = 3600;

export function operationsAttachmentExtension(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m.includes("wordprocessingml")) return "docx";
  return "jpg";
}

export function buildOperationsAttachmentPath(
  companyId: string,
  contentId: string,
  mimeType: string,
  originalName?: string,
): string {
  const ext = operationsAttachmentExtension(mimeType);
  const safeName = (originalName ?? "file")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);
  return `${companyId}/${contentId}/${randomUUID()}-${safeName}.${ext}`;
}

export function isPreviewableMime(mime: string): boolean {
  return OPERATIONS_PREVIEWABLE_MIME_TYPES.has(mime.toLowerCase());
}

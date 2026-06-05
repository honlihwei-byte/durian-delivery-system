import {
  buildTaskProofStoragePath,
  TASK_PROOF_ALLOWED_TYPES,
  TASK_PROOF_BUCKET,
  TASK_PROOF_MAX_BYTES,
  taskProofExtension,
} from "@/lib/retail-tasks/task-photo-storage";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export async function uploadTaskProofPhoto(
  supabase: Supabase,
  params: {
    companyId: string;
    shopId: string;
    taskId: string;
    staffId: string;
    file: File | Blob;
    mimeType: string;
  },
): Promise<string> {
  const mime = params.mimeType.toLowerCase();
  if (!TASK_PROOF_ALLOWED_TYPES.has(mime)) {
    throw new Error("Unsupported image type.");
  }
  if (params.file.size > TASK_PROOF_MAX_BYTES) {
    throw new Error("Image too large (max 5MB).");
  }

  const ext = taskProofExtension(mime);
  const basePath = buildTaskProofStoragePath(
    params.companyId,
    params.shopId,
    params.taskId,
    params.staffId,
  );
  const path = basePath.replace(/\.jpg$/, `.${ext}`);

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage.from(TASK_PROOF_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

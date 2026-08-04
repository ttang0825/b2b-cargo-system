import { supabase } from "@/lib/supabaseClient";
import {
  DISPATCH_PHOTO_BUCKET,
  DISPATCH_PHOTO_ALLOWED_MIME_TYPES,
  DISPATCH_PHOTO_MAX_SIZE_BYTES,
  DispatchPhotoCategory,
} from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — admin 브라우저에서 Storage로 직접 업로드하는 3단계
// (upload-url 발급 → 파일 바이트 직접 업로드 → finalize)를 한 번에 처리.
// 파일 바이트 자체는 Vercel 서버를 거치지 않고 Storage로 바로 올라간다(원칙 49번).
export async function uploadDispatchPhoto(
  dispatchId: string,
  category: DispatchPhotoCategory,
  file: File
): Promise<{ error: string | null }> {
  if (file.size <= 0 || file.size > DISPATCH_PHOTO_MAX_SIZE_BYTES) {
    return { error: "file_too_large" };
  }
  if (!DISPATCH_PHOTO_ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return { error: "invalid_mime_type" };
  }

  const urlRes = await fetch("/api/admin/dispatch-photos/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dispatch_id: dispatchId,
      category,
      mime_type: file.type,
      file_size_bytes: file.size,
    }),
  });
  const urlData = await urlRes.json();
  if (!urlRes.ok) return { error: urlData.error || "upload_failed" };

  const { error: uploadError } = await supabase.storage
    .from(DISPATCH_PHOTO_BUCKET)
    .uploadToSignedUrl(urlData.path, urlData.token, file);
  if (uploadError) return { error: "upload_failed" };

  const finalizeRes = await fetch("/api/admin/dispatch-photos/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dispatch_id: dispatchId,
      category,
      storage_path: urlData.path,
      original_filename: file.name,
    }),
  });
  const finalizeData = await finalizeRes.json();
  if (!finalizeRes.ok) return { error: finalizeData.error || "save_failed" };

  return { error: null };
}

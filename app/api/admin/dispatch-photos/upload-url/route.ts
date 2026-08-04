import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import {
  DISPATCH_PHOTO_BUCKET,
  DISPATCH_PHOTO_CATEGORIES,
  DISPATCH_PHOTO_ALLOWED_MIME_TYPES,
  DISPATCH_PHOTO_MAX_SIZE_BYTES,
  DISPATCH_PHOTO_MAX_COUNT_PER_CATEGORY,
  isDispatchReadyForPhotoUpload,
  mimeToSafeExtension,
} from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — 1단계: Signed Upload URL 발급.
// 재직 직원이면 role 무관 누구나 가능(업로드는 전 직원, 삭제만 관리자 전용).
// 배차상태·카테고리·파일크기·MIME·카테고리별 업로드 개수를 서버가 매번
// fresh 조회로 검증(클라이언트가 들고 있는 값을 신뢰하지 않음, 원칙 44번과 동일한 습관).
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { dispatch_id, category, mime_type, file_size_bytes } = (await req.json()) as {
    dispatch_id: string;
    category: string;
    mime_type: string;
    file_size_bytes: number;
  };

  if (!dispatch_id || !DISPATCH_PHOTO_CATEGORIES.includes(category as any)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }
  if (!DISPATCH_PHOTO_ALLOWED_MIME_TYPES.includes(mime_type as any)) {
    return NextResponse.json({ error: "invalid_mime_type" }, { status: 400 });
  }
  if (!file_size_bytes || file_size_bytes <= 0 || file_size_bytes > DISPATCH_PHOTO_MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const { data: dispatch, error: dispatchError } = await admin
    .from("dispatches")
    .select("id,dispatch_status,delivery_confirmed")
    .eq("id", dispatch_id)
    .maybeSingle();
  if (dispatchError || !dispatch) {
    return NextResponse.json({ error: "dispatch_not_found" }, { status: 404 });
  }
  if (!isDispatchReadyForPhotoUpload(dispatch.dispatch_status, dispatch.delivery_confirmed)) {
    return NextResponse.json({ error: "dispatch_not_ready" }, { status: 400 });
  }

  const { count } = await admin
    .from("dispatch_photos")
    .select("id", { count: "exact", head: true })
    .eq("dispatch_id", dispatch_id)
    .eq("category", category)
    .is("deleted_at", null);
  if ((count || 0) >= DISPATCH_PHOTO_MAX_COUNT_PER_CATEGORY) {
    return NextResponse.json({ error: "too_many_photos" }, { status: 400 });
  }

  const ext = mimeToSafeExtension(mime_type);
  if (!ext) {
    return NextResponse.json({ error: "invalid_mime_type" }, { status: 400 });
  }
  // 사람이 추측 불가능한 경로 — 회사명/화주명/오더번호/원본 파일명은 절대 사용 안 함
  const storagePath = `${dispatch_id}/${category}/${crypto.randomUUID()}.${ext}`;

  const { data: signed, error: signedError } = await admin.storage
    .from(DISPATCH_PHOTO_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (signedError || !signed) {
    return NextResponse.json({ error: signedError?.message || "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ path: signed.path, token: signed.token });
}

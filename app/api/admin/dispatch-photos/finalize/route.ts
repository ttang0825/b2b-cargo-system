import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import {
  DISPATCH_PHOTO_BUCKET,
  DISPATCH_PHOTO_CATEGORIES,
  DISPATCH_PHOTO_ALLOWED_MIME_TYPES,
  DISPATCH_PHOTO_MAX_SIZE_BYTES,
  isDispatchReadyForPhotoUpload,
} from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — 2단계: 업로드 완료 후 메타데이터 확정.
// 요청 시점 값(mime_type/file_size_bytes)을 그대로 믿지 않고, Storage에
// 실제로 올라간 객체를 재조회해서 그 값을 진실로 사용한다.
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

  const { dispatch_id, category, claim_id, storage_path, original_filename } = (await req.json()) as {
    dispatch_id: string;
    category: string;
    claim_id?: string | null;
    storage_path: string;
    original_filename: string | null;
  };

  if (!dispatch_id || !DISPATCH_PHOTO_CATEGORIES.includes(category as any) || !storage_path) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }
  if (category === "claim" && !claim_id) {
    return NextResponse.json({ error: "claim_not_found" }, { status: 400 });
  }
  // 경로가 이 배차·카테고리 몫으로 서버가 생성한 경로가 맞는지 확인(클라이언트가
  // 임의 경로를 finalize에 넣어 다른 배차의 폴더에 기록하는 것 방지)
  if (!storage_path.startsWith(`${dispatch_id}/${category}/`)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  // 동일 storage_path로 재호출 시 새 행을 또 만들지 않고 기존 행을 반환
  const { data: existing } = await admin
    .from("dispatch_photos")
    .select("id,category,claim_id,original_filename,mime_type,file_size_bytes,uploaded_at")
    .eq("storage_path", storage_path)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ photo: existing, already_finalized: true });
  }

  const { data: dispatch, error: dispatchError } = await admin
    .from("dispatches")
    .select("id,dispatch_status,delivery_confirmed")
    .eq("id", dispatch_id)
    .maybeSingle();
  if (dispatchError || !dispatch) {
    return NextResponse.json({ error: "dispatch_not_found" }, { status: 404 });
  }

  if (category === "claim") {
    // 클레임 증빙은 배차상태 게이트 없음(로드맵⑤ 결정사항) — claim_id가 이
    // 배차 소속인지만 재확인
    const { data: claim } = await admin
      .from("claims")
      .select("id,dispatch_id")
      .eq("id", claim_id)
      .maybeSingle();
    if (!claim || claim.dispatch_id !== dispatch_id) {
      return NextResponse.json({ error: "claim_not_found" }, { status: 404 });
    }
  } else if (!isDispatchReadyForPhotoUpload(dispatch.dispatch_status, dispatch.delivery_confirmed)) {
    return NextResponse.json({ error: "dispatch_not_ready" }, { status: 400 });
  }

  const folder = storage_path.slice(0, storage_path.lastIndexOf("/"));
  const fileName = storage_path.slice(storage_path.lastIndexOf("/") + 1);
  const { data: listed, error: listError } = await admin.storage
    .from(DISPATCH_PHOTO_BUCKET)
    .list(folder, { search: fileName, limit: 1 });
  const found = listed?.find((f) => f.name === fileName);
  if (listError || !found || !found.metadata) {
    return NextResponse.json({ error: "upload_not_found" }, { status: 400 });
  }

  const actualMimeType = found.metadata.mimetype as string;
  const actualSize = Number(found.metadata.size);
  if (
    !DISPATCH_PHOTO_ALLOWED_MIME_TYPES.includes(actualMimeType as any) ||
    !actualSize ||
    actualSize <= 0 ||
    actualSize > DISPATCH_PHOTO_MAX_SIZE_BYTES
  ) {
    await admin.storage.from(DISPATCH_PHOTO_BUCKET).remove([storage_path]);
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await admin
    .from("dispatch_photos")
    .insert({
      dispatch_id,
      category,
      claim_id: category === "claim" ? claim_id : null,
      storage_path,
      original_filename: original_filename || fileName,
      mime_type: actualMimeType,
      file_size_bytes: actualSize,
      uploaded_by: currentStaff.id,
      uploaded_by_name_snapshot: currentStaff.name,
    })
    .select("id,category,claim_id,original_filename,mime_type,file_size_bytes,uploaded_at")
    .single();

  if (insertError) {
    // 유니크 제약 위반(경합) — 그 사이 다른 요청이 먼저 finalize한 경우 기존 행 반환
    if ((insertError as any).code === "23505") {
      const { data: race } = await admin
        .from("dispatch_photos")
        .select("id,category,claim_id,original_filename,mime_type,file_size_bytes,uploaded_at")
        .eq("storage_path", storage_path)
        .maybeSingle();
      if (race) return NextResponse.json({ photo: race, already_finalized: true });
    }
    await admin.storage.from(DISPATCH_PHOTO_BUCKET).remove([storage_path]);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ photo: inserted });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { DISPATCH_PHOTO_BUCKET, DISPATCH_PHOTO_PREVIEWABLE_MIME_TYPES } from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — admin 목록조회. storage_path는 응답에 절대 포함하지 않음
// (열람은 반드시 signed-url API에 photo_id만 넘겨서 별도 발급).
// 삭제된(deleted_at 있음) 사진은 admin 목록에서도 제외.
//
// 미리보기 가능한 형식(JPEG/PNG/WebP)의 썸네일 signed URL은 여기서 한 번에
// batch로 발급해서 응답에 같이 실어보낸다 — 이전엔 클라이언트가 목록을 받은
// 뒤 사진마다 signed-url API를 개별 호출했는데(각 호출이 재조회+인증까지
// 전부 다시 거침), 사진이 여러 장이면 그만큼 왕복이 늘어나 로딩이 느리게
// 느껴졌음(PR #66 리뷰). createSignedUrls()로 한 번의 Storage API 호출에
// 몰아서 발급.
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const dispatchId = searchParams.get("dispatch_id");
  if (!dispatchId) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("dispatch_photos")
    .select(
      "id,category,claim_id,storage_path,original_filename,mime_type,file_size_bytes,uploaded_at,uploaded_by_name_snapshot"
    )
    .eq("dispatch_id", dispatchId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = data || [];
  const previewablePaths = rows
    .filter((r) => DISPATCH_PHOTO_PREVIEWABLE_MIME_TYPES.includes(r.mime_type))
    .map((r) => r.storage_path);

  const signedByPath: Record<string, string> = {};
  if (previewablePaths.length > 0) {
    const { data: signed } = await admin.storage
      .from(DISPATCH_PHOTO_BUCKET)
      .createSignedUrls(previewablePaths, 300);
    (signed || []).forEach((s) => {
      if (s.path && s.signedUrl && !s.error) signedByPath[s.path] = s.signedUrl;
    });
  }

  const photos = rows.map(({ storage_path, ...rest }) => ({
    ...rest,
    preview_url: signedByPath[storage_path] || null,
  }));

  return NextResponse.json({ photos });
}

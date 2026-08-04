import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DISPATCH_PHOTO_BUCKET,
  DISPATCH_PHOTO_PREVIEWABLE_MIME_TYPES,
  PORTAL_VISIBLE_DISPATCH_PHOTO_CATEGORIES,
} from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — 화주포털 목록조회. 로그인 화주의 company_id와
// dispatch→order.company_id가 일치할 때만 조회 허용, storage_path는 절대
// 응답에 포함하지 않음(다운로드는 photo_id로 signed-url API를 따로 호출).
//
// 미리보기 가능한 형식의 썸네일 signed URL은 여기서 batch로 함께 발급해서
// 응답에 실어보냄(사진마다 signed-url API를 따로 호출하던 것을 제거 —
// PR #66 리뷰에서 화주포털 사진 로딩이 느리다는 피드백 반영).
//
// 로드맵⑤에서 'claim' 카테고리가 추가됐지만 클레임·사고 증빙은 화주포털에
// 절대 노출하지 않음(결정사항 3) — 허용목록으로 명시적으로 걸러냄(카테고리가
// 늘어나도 실수로 새 카테고리가 자동 노출되지 않게).
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
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "access_denied" }, { status: 401 });
  }
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "access_denied" }, { status: 401 });
  }

  const { data: account } = await admin
    .from("customer_accounts")
    .select("company_id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!account?.company_id) {
    return NextResponse.json({ error: "access_denied" }, { status: 403 });
  }

  const { dispatch_id } = (await req.json()) as { dispatch_id: string };
  if (!dispatch_id) {
    return NextResponse.json({ error: "access_denied" }, { status: 400 });
  }

  const { data: dispatch } = await admin
    .from("dispatches")
    .select("id,orders(company_id)")
    .eq("id", dispatch_id)
    .maybeSingle();
  const orderCompanyId = (dispatch?.orders as any)?.company_id;
  if (!dispatch || orderCompanyId !== account.company_id) {
    return NextResponse.json({ error: "access_denied" }, { status: 403 });
  }

  const { data } = await admin
    .from("dispatch_photos")
    .select("id,category,storage_path,original_filename,mime_type,file_size_bytes,uploaded_at")
    .eq("dispatch_id", dispatch_id)
    .in("category", PORTAL_VISIBLE_DISPATCH_PHOTO_CATEGORIES)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

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

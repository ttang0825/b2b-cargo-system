import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DISPATCH_PHOTO_BUCKET, PORTAL_VISIBLE_DISPATCH_PHOTO_CATEGORIES } from "@/lib/dispatchPhotos";

// 로드맵④ POD·인수증 — 화주포털 열람용 signed URL 발급. photo_id만 입력받고,
// storage_path는 서버가 조회해서만 사용. 회사 소유 확인 후에만 발급.
// 로드맵⑤ 'claim' 카테고리는 화주포털에 절대 노출하지 않음(결정사항 3) —
// list API가 애초에 photo_id를 안 내려주지만, 이 API 자체에서도 카테고리를
// 한 번 더 걸러서 이중으로 막음(원칙 25번과 같은 이중체크 정신).
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

  const { photo_id } = (await req.json()) as { photo_id: string };
  if (!photo_id) {
    return NextResponse.json({ error: "not_found_or_deleted" }, { status: 400 });
  }

  const { data: photo } = await admin
    .from("dispatch_photos")
    .select("storage_path,category,dispatch_id,dispatches(orders(company_id))")
    .eq("id", photo_id)
    .in("category", PORTAL_VISIBLE_DISPATCH_PHOTO_CATEGORIES)
    .is("deleted_at", null)
    .maybeSingle();
  const orderCompanyId = (photo?.dispatches as any)?.orders?.company_id;
  if (!photo || orderCompanyId !== account.company_id) {
    return NextResponse.json({ error: "not_found_or_deleted" }, { status: 404 });
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(DISPATCH_PHOTO_BUCKET)
    .createSignedUrl(photo.storage_path, 300);
  if (signedError || !signed) {
    return NextResponse.json({ error: signedError?.message || "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}

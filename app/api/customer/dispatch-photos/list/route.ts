import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 로드맵④ POD·인수증 — 화주포털 목록조회. 로그인 화주의 company_id와
// dispatch→order.company_id가 일치할 때만 조회 허용, storage_path는 절대
// 응답에 포함하지 않음(다운로드는 photo_id로 signed-url API를 따로 호출).
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
    .select("id,category,original_filename,mime_type,file_size_bytes,uploaded_at")
    .eq("dispatch_id", dispatch_id)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  return NextResponse.json({ photos: data || [] });
}

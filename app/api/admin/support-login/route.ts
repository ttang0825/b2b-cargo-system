import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 관리자가 화주포털 계정으로 임시 로그인(고객지원용 접속)할 수 있는 링크를 발급.
// Supabase Auth Admin API의 magic link를 이용 — 이메일 발송 없이 서버에서 바로
// token_hash를 발급받아, 관리자 브라우저의 새 탭에서 직접 검증(verifyOtp)해 세션을 만듦
export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "고객지원용 접속은 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { customer_account_id } = await req.json();
  if (!customer_account_id) {
    return NextResponse.json({ error: "계정 정보가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: account, error: accountError } = await admin
    .from("customer_accounts")
    .select("id,email,company_id,is_active,companies(name)")
    .eq("id", customer_account_id)
    .single();
  if (accountError || !account) {
    return NextResponse.json({ error: "포털 계정을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!account.is_active) {
    return NextResponse.json({ error: "비활성화된 계정은 지원접속할 수 없습니다." }, { status: 400 });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: account.email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message || "접속 링크 발급에 실패했습니다." },
      { status: 400 }
    );
  }

  await admin.from("support_access_logs").insert({
    staff_id: currentStaff.id,
    staff_name: currentStaff.name,
    company_id: account.company_id,
    customer_account_id: account.id,
    customer_email: account.email,
    company_name: (account.companies as any)?.name || null,
  });

  return NextResponse.json({
    token_hash: linkData.properties.hashed_token,
    email: account.email,
  });
}

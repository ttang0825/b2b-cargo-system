import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { company_id } = await req.json();
  if (!company_id) {
    return NextResponse.json({ error: "company_id가 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 회사를 지우기 전에 연결된 포털 계정의 Auth 유저부터 정리합니다.
  // (회사만 지우면 Auth 계정이 고아로 남아, 같은 이메일로 재가입이 막히는 문제가 있었습니다)
  const { data: accounts, error: accountsError } = await admin
    .from("customer_accounts")
    .select("auth_user_id")
    .eq("company_id", company_id);
  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 400 });
  }

  for (const account of accounts || []) {
    if (account.auth_user_id) {
      await admin.auth.admin.deleteUser(account.auth_user_id);
    }
  }

  const { error: deleteError } = await admin.from("companies").delete().eq("id", company_id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, deletedAccounts: accounts?.length || 0 });
}

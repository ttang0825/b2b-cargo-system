import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { email } = await req.json();
  if (!email || !email.trim()) {
    return NextResponse.json({ error: "이메일이 필요합니다." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Supabase Auth 목록 API는 이메일로 바로 검색하는 기능이 없어서, 페이지를 돌며 직접 찾습니다.
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  let found: any = null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    found = data.users.find((u: any) => (u.email || "").toLowerCase() === target) || null;
    if (found || data.users.length < perPage) break;
  }

  if (!found) {
    return NextResponse.json({ found: false });
  }

  const { data: account } = await admin
    .from("customer_accounts")
    .select("id,company_id,companies(name)")
    .eq("auth_user_id", found.id)
    .maybeSingle();

  return NextResponse.json({
    found: true,
    auth_user_id: found.id,
    email: found.email,
    created_at: found.created_at,
    linkedCompanyName: (account as any)?.companies?.name || null,
    isOrphan: !account,
  });
}

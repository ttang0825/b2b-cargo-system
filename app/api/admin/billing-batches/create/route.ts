import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 로드맵 ②-B: 월정산 묶음(draft) 생성. 클라이언트가 DB 함수를 직접 RPC 호출하지
// 않고(작업지시서 3-4) 반드시 이 서버 API를 거치도록 함.
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
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { company_id, period_start, period_end } = (await req.json()) as {
    company_id: string;
    period_start: string;
    period_end: string;
  };
  if (!company_id || !period_start || !period_end) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("create_billing_batch", {
    p_company_id: company_id,
    p_period_start: period_start,
    p_period_end: period_end,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}

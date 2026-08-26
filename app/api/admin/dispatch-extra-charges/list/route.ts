import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 19차 — 현장 추가비 조회를 관리자 화면에서 직접 하지 않고 이 서버 API로 옮겼다.
//
// 🔴 왜 서버로 옮겼는가. 16차가 차주 지급액(driver_payout_amount)을 화주에게 감추려고
//   `authenticated` 롤에서 이 테이블의 전체 SELECT 권한을 회수하고 안전한 8개 컬럼만
//   다시 GRANT 했다. 19차부터 관리자 화면 질의도 로그인 세션(= `authenticated`)으로
//   나가므로, 그대로 두면 관리자 화면이 지급액을 읽으려다 권한 오류로 막힌다.
//   컬럼 GRANT 는 롤 단위라 "직원은 되고 화주는 안 되게"를 표현할 수 없다.
//   그래서 관리자 조회만 service_role 로 옮겨 16차의 컬럼 보호를 그대로 지킨다
//   (사용자 결정 2026-08-26).
// 🔴 authenticated 에 전체 SELECT 를 다시 주는 방식으로 되돌리지 말 것 —
//   그 순간 화주가 자기 건의 차주 지급액을 DB 수준에서 읽을 수 있게 된다.
//
// ⚠️ 등록·취소는 이미 서버 API(register / cancel)를 거치므로 건드리지 않았다.
// ⚠️ 화주포털용 조회는 별개다 — 화주는 지금도 컬럼 GRANT 로 제한된 8개만 본다.
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: Request) {
  // 원칙 52 — middleware 의 matcher 는 /api/admin/* 에 적용되지 않으므로
  // 이 라우트에서 따로 확인한다.
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

  const url = new URL(req.url);
  const dispatchIdsParam = url.searchParams.get("dispatch_ids");
  const correctionInvoiceId = url.searchParams.get("correction_invoice_id");

  // 상태·시점 필터는 화면마다 조건이 달라서 여기서 걸지 않고 전부 내려준다.
  // 호출부가 기존과 똑같은 방식으로 걸러 쓰므로 계산 로직이 바뀌지 않는다.
  let query = admin.from("dispatch_extra_charges").select("*");

  if (correctionInvoiceId) {
    query = query.eq("correction_invoice_id", correctionInvoiceId);
  } else {
    const ids = (dispatchIdsParam || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ data: [] });
    query = query.in("dispatch_id", ids);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data || [] });
}

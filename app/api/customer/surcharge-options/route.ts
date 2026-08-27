import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";

// 21차 — 화주포털 발주요청 화면의 선택지 목록(차량형태·물품특성·운송시간·왕복/편도)을
// 내려주는 서버 API.
//
// 🔴 왜 서버로 옮겼는가. 21차에서 `rate_surcharges` 에 RLS 를 켜고 **직원 전용 정책**을
//   줬다. 이 표에는 선택지 이름뿐 아니라 **가산 금액(rate_pct·flat_amount)** 이 함께
//   들어 있는데, 28차가 "전체 운임표·추가비 기준은 비공개"로 확정했기 때문이다.
//   화주에게 SELECT 정책을 주면 금액까지 읽힌다 — 컬럼 GRANT 로 가르려 해도 직원도
//   같은 `authenticated` 롤이라 구분되지 않는다(16차가 겪은 것과 같은 문제).
//   그래서 **이름만** service_role 로 읽어 내려준다(사용자 결정 2026-08-26).
// 🔴 `rate_pct`·`flat_amount` 를 여기에 추가하지 말 것.
// ⚠️ 관리자 화면은 이 API 를 쓰지 않는다 — 직원 정책으로 표를 직접 읽는다(금액 포함).
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const admin = createServiceClient(url, serviceKey);

  // 선택지 이름만. 금액 컬럼은 조회 자체를 하지 않는다.
  const { data, error } = await admin
    .from("rate_surcharges")
    .select("category,option_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data || [] });
}

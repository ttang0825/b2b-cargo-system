import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { accrueRewardSafely } from "@/lib/rewardAccrue";

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

  const { batch_id } = (await req.json()) as { batch_id: string };
  if (!batch_id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("mark_billing_batch_payment_received", {
    p_batch_id: batch_id,
    p_staff_id: currentStaff.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 🔴 **월정산 묶음이 리워드 적립의 두 번째 트리거다**(건별 입금확인과 둘이다).
  //
  //    🔴 **DB 함수를 고치지 않았다** — 그 함수는 묶음의 `released_at is null` 인
  //       항목의 invoice 를 전부 `payment_received = true` 로 만들고 `{success,
  //       company_outstanding_amount}` 만 돌려준다(본문 실측 2026-09-20).
  //       **어느 invoice 였는지는 안 준다.** 그래서 적립 쪽이 `customer_billing_batch_items`
  //       를 **같은 조건으로 다시 읽는다** — 조건이 갈리면 갱신된 건과 적립된 건이 갈린다.
  //       ⚠️ 묶음 DB 함수 12개 중 11개가 저장소 밖이라(PR #154) 고치는 것은 위험하다.
  //
  //    🔴 **원장은 묶음 한 줄이 아니라 운송건별이다**(전달문서 §17) — 어느 건이
  //       얼마씩 쌓였는지 나중에 되짚을 수 있어야 한다.
  //
  //    🔴 **성공했을 때만 부른다.** 함수는 실패를 예외가 아니라 `{success:false}` 로
  //       돌려주므로(`batch_not_confirmed`·`already_paid`), 그것을 보고 가른다 —
  //       안 보면 **입금 처리가 안 됐는데 적립만 나간다.**
  //    🔴 **적립 실패가 입금 처리를 막지 않는다**(3초 상한 · 던지지 않음).
  const reward = (data as any)?.success
    ? await accrueRewardSafely({
        admin,
        staffId: currentStaff.id,
        sourceType: "billing_batch",
        sourceId: batch_id,
      })
    : undefined;

  return NextResponse.json({ ...(data as any), reward });
}

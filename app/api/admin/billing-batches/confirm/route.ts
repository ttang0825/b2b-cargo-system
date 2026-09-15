import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { calcPaymentDueDate } from "@/lib/paymentDueDate";

// 로드맵 ②-B: 월정산 묶음 확정 — 작업지시서 6-1에 "확정 버튼(관리자 전용)"으로
// 명시되어 있어 관리자만 호출 가능(원칙 25번).
//
// 🔴 **확정 직후 납부기한을 채운다**(2026-09-15). 연체 자동 판정
//    (`scripts/mark-overdue.sql`)이 `payment_due_date` 를 기준으로 도는데, 그 값이
//    비어 있으면 그 묶음은 **영영 연체로 잡히지 않는다.** 실측에서 결제일이 채워진
//    묶음이 **0건**이었던 것이 이 자리다(손입력 칸만 있었다).
//    🔴 **이미 값이 있으면 덮어쓰지 않는다** — 담당자가 넣은 날짜가 화주와 실제로
//       합의한 날짜다. 계산값은 화주 설정에서 나온 기본값일 뿐이다.
//    🔴 **채우지 못해도 확정은 성공이다** — 「협의」 화주는 날짜를 만들 수 없고,
//       없는 날짜를 지어내면 합의하지 않은 날에 연체가 붙는다.
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
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "묶음 확정은 관리자만 할 수 있습니다." }, { status: 403 });
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

  const { data, error } = await admin.rpc("confirm_billing_batch", {
    p_batch_id: batch_id,
    p_staff_id: currentStaff.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let paymentDueDate: string | null = null;
  if ((data as any)?.success) {
    paymentDueDate = await ensurePaymentDueDate(admin, batch_id);
  }

  return NextResponse.json({ ...(data as any), payment_due_date: paymentDueDate });
}

/**
 * 납부기한이 비어 있으면 화주 거래조건에서 계산해 채운다. 채운 날짜(또는 `null`)를 돌려준다.
 * 🔴 여기서 나는 오류는 확정을 되돌리지 않는다 — 부가 작업이다.
 */
async function ensurePaymentDueDate(admin: any, batchId: string): Promise<string | null> {
  const { data: batch, error: batchError } = await admin
    .from("customer_billing_batches")
    .select("company_id,period_end,payment_due_date")
    .eq("id", batchId)
    .maybeSingle();
  if (batchError || !batch || batch.payment_due_date) return null;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("payment_due_basis,payment_due_value")
    .eq("id", batch.company_id)
    .maybeSingle();
  if (companyError || !company) return null;

  const due = calcPaymentDueDate(batch.period_end, company);
  if (!due) return null;

  const { error: dueError } = await admin.rpc("set_billing_batch_payment_due_date", {
    p_batch_id: batchId,
    p_due_date: due,
  });
  if (dueError) {
    console.error("[billing-batches/confirm] 납부기한 설정 실패:", dueError.message);
    return null;
  }
  return due;
}

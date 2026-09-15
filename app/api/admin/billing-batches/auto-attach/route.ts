import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { monthToPeriod, monthLabelForDate, monthRangeOf } from "@/lib/billingPeriod";
import { calcPaymentDueDate } from "@/lib/paymentDueDate";

// 월정산 묶음 **자동 생성** — 운송완료로 정산 건이 만들어진 직후에 불린다.
//
// 🔴 **사용자 신고가 출발점이다**(2026-09-15) — *"월정산건은 운송 완료시 자동으로
//    월정산 묶음이 만들어지고…"*. 그전에는 정산 건(invoice)만 자동으로 생기고
//    묶음은 담당자가 화주·정산월을 골라 손으로 만들어야 했다(실측: 월정산 2건 중
//    묶음에 담긴 것 **0건**).
//
// 🔴 **DB 함수를 새로 만들지 않았다.** 묶음 로직 12개가 저장소에 없는 상태라
//    (14차 산출물 · 마이그레이션 자동화 47차보다 먼저) 여기서 또 DB 에 로직을 쓰면
//    저장소 밖 로직이 더 늘어난다. 이 라우트는 **기존 함수 두 개를 순서대로 부를 뿐**이다.
//
// 🔴 **클라이언트 값을 하나도 믿지 않는다** — 받는 것은 `invoice_id` 하나이고,
//    수금방식·청구주기·상태·화주는 전부 서버가 다시 읽는다(원칙 44번과 같은 결).
//
// 🔴 **자동으로 만드는 것은 「작성 중(draft)」 묶음까지다.** 확정·세금계산서·입금은
//    담당자가 손으로 누른다(사용자 확정 2026-09-15 — (A)안). 돈이 걸린 상태를 코드가
//    마음대로 굳히지 않는다는 선이고 원칙 44번과 같은 결이다.
//
// 🔴 **이미 확정됐거나 해제된 묶음이 있으면 아무것도 하지 않는다.**
//    확정된 뒤에 들어온 건은 「보충 묶음」이 필요한데 그것을 자동으로 만들면
//    담당자가 방금 확정한 달에 새 묶음이 조용히 또 생긴다. 해제(cancelled)는
//    담당자가 일부러 푼 것이라 자동으로 되살리면 그 판단과 싸운다.
//    둘 다 묶음 화면이 이미 「보충 묶음 만들기」·「새 묶음 만들기」로 안내한다.
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type SkipReason =
  | "not_monthly"
  | "not_broker"
  | "no_company"
  | "no_reference_date"
  | "batch_not_draft";

function skipped(reason: SkipReason) {
  // 🔴 건너뛴 것은 **실패가 아니다** — 호출부가 fire-and-forget 이라 어차피 응답을
  //    안 보지만, 로그와 수동 호출에서 이유가 드러나도록 200 으로 돌려준다.
  return NextResponse.json({ success: true, attached: false, reason });
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

  const { invoice_id } = (await req.json()) as { invoice_id: string };
  if (!invoice_id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // ① 정산 건을 서버가 다시 읽는다 — 🔴 `error` 를 반드시 받는다(원칙 55번).
  const { data: invoice, error: invoiceError } = await admin
    .from("invoices")
    .select("id,company_id,billing_cycle,collection_method,settlement_reference_date")
    .eq("id", invoice_id)
    .maybeSingle();
  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 400 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "정산 건을 찾을 수 없습니다." }, { status: 404 });
  }

  // 🔴 묶음 후보 조건은 `is_billing_batch_candidate()` 가 최종 판정한다(DB 함수).
  //    여기서는 **부를 필요가 없는 건을 걸러낼 뿐**이고, 두 판정이 갈려도
  //    `add_item_to_billing_batch` 가 거절하므로 잘못 담기지 않는다.
  if (invoice.billing_cycle !== "monthly") return skipped("not_monthly");
  if (invoice.collection_method !== "broker") return skipped("not_broker");
  if (!invoice.company_id) return skipped("no_company");
  if (!invoice.settlement_reference_date) return skipped("no_reference_date");

  // ② 화주의 마감일·결제일 설정
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("billing_cutoff_day,payment_due_basis,payment_due_value")
    .eq("id", invoice.company_id)
    .maybeSingle();
  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 400 });
  }
  const cutoffDay = (company as any)?.billing_cutoff_day ?? null;
  const monthLabel = monthLabelForDate(invoice.settlement_reference_date, cutoffDay);

  // ③ 이 화주·정산월의 가장 최근 묶음 — 🔴 기간 완전일치가 아니라 `period_end` 가
  //    그 달력월 안에 있는지로 찾는다(원칙 46번 · 묶음 화면과 같은 규칙).
  const range = monthRangeOf(monthLabel);
  const { data: latest, error: latestError } = await admin
    .from("customer_billing_batches")
    .select("id,batch_status,period_start,period_end,payment_due_date")
    .eq("company_id", invoice.company_id)
    .gte("period_end", range.start)
    .lte("period_end", range.end)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    return NextResponse.json({ error: latestError.message }, { status: 400 });
  }

  let batchId: string | null = null;
  let periodEnd: string | null = null;
  let dueAlreadySet = false;

  if (latest) {
    if ((latest as any).batch_status !== "draft") return skipped("batch_not_draft");
    batchId = (latest as any).id;
    periodEnd = (latest as any).period_end;
    dueAlreadySet = !!(latest as any).payment_due_date;
  } else {
    const period = monthToPeriod(monthLabel, cutoffDay);
    const { data: created, error: createError } = await admin.rpc("create_billing_batch", {
      p_company_id: invoice.company_id,
      p_period_start: period.period_start,
      p_period_end: period.period_end,
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    // 🔴 **`draft_already_exists` 는 실패가 아니다** — 운송완료 두 건이 거의 동시에
    //    처리되면(배차 목록에서 연달아 누르는 흔한 일이다) 뒤엣것이 여기에 걸린다.
    //    그때는 앞엣것이 방금 만든 묶음을 다시 찾아서 거기에 담는다.
    //    🔴 이 분기를 지우면 **같은 순간에 완료한 둘째 건이 조용히 묶음에서 빠진다.**
    if (!(created as any)?.success && (created as any)?.reason !== "draft_already_exists") {
      return NextResponse.json(
        { success: false, reason: (created as any)?.reason || "create_failed" },
        { status: 400 }
      );
    }
    // 🔴 반환 모양에 기대지 않는다 — `batch_id` 를 주면 쓰고, 안 주면 다시 찾는다.
    //    🟢 `create_billing_batch` 는 성공 시 `{success, batch_id}` 를 준다(본문 실측
    //       2026-09-15 · `_verify.sql` ⑲-c). 아래 재조회는 `draft_already_exists`
    //       경로와 함수가 바뀔 때를 위한 안전망이다.
    batchId = (created as any)?.batch_id || null;
    periodEnd = period.period_end;
    if (!batchId) {
      const { data: refound } = await admin
        .from("customer_billing_batches")
        .select("id")
        .eq("company_id", invoice.company_id)
        .eq("period_start", period.period_start)
        .eq("period_end", period.period_end)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      batchId = (refound as any)?.id || null;
    }
  }

  if (!batchId) {
    return NextResponse.json({ error: "묶음을 찾지 못했습니다." }, { status: 500 });
  }

  // ④ 담기
  const { data: added, error: addError } = await admin.rpc("add_item_to_billing_batch", {
    p_batch_id: batchId,
    p_invoice_id: invoice_id,
  });
  if (addError) {
    return NextResponse.json({ error: addError.message }, { status: 400 });
  }

  // ⑤ 납부기한 — 화주 설정에서 계산되면 채운다.
  //    🔴 **이미 값이 있으면 덮어쓰지 않는다** — 담당자가 손으로 넣었을 수 있고,
  //       그것이 화주와 실제로 합의한 날짜다.
  //    🔴 여기서 실패해도 묶음 자체는 살린다(부가 작업이다).
  //    🟢 `set_billing_batch_payment_due_date` 는 **작성 중(draft)에도 받는다**
  //       (`cancelled` 만 거절한다 — 본문 실측 2026-09-15 · `_verify.sql` ⑲-b).
  //       그 함수가 「기한이 이미 지났으면 `overdue`」까지 스스로 붙이는데, draft 에
  //       붙어도 화면은 **확정된 묶음에만** 연체를 그리므로 어긋나지 않는다.
  let paymentDueDate: string | null = null;
  if (!dueAlreadySet) {
    paymentDueDate = calcPaymentDueDate(periodEnd, company as any);
    if (paymentDueDate) {
      const { error: dueError } = await admin.rpc("set_billing_batch_payment_due_date", {
        p_batch_id: batchId,
        p_due_date: paymentDueDate,
      });
      if (dueError) {
        console.error("[billing-batches/auto-attach] 납부기한 설정 실패:", dueError.message);
        paymentDueDate = null;
      }
    }
  }

  return NextResponse.json({
    success: !!(added as any)?.success,
    attached: !!(added as any)?.success,
    reason: (added as any)?.reason || null,
    batch_id: batchId,
    month: monthLabel,
    payment_due_date: paymentDueDate,
  });
}

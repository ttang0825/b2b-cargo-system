import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { attributeActiveExtraCharges } from "@/lib/dashboardExtraChargeAgg";
import { isRecurringContractActive } from "@/lib/companyFields";

// 로드맵⑥ 운영 대시보드 — 담당자별 영업 성과 같은 민감정보를 포함하므로 관리자만
// 조회 가능(원칙25와 동일한 이중체크: 화면단은 TopNav 메뉴 숨김+middleware.ts 라우트
// 차단, API 라우트는 middleware.ts 적용 대상이 아니라서(파일 하단 주석 참고) 여기서
// 별도로 다시 확인해야 함).
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

export async function GET() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json({ error: "운영 대시보드는 관리자만 조회할 수 있습니다." }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  // 조회기간은 최근 12개월 고정(1차 범위 — 기간선택 UI 없음)
  const sinceIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: invoices, error: invoicesError },
    { data: orders, error: ordersError },
    { data: dispatches, error: dispatchesError },
    { data: extraCharges, error: extraChargesError },
    { data: claims, error: claimsError },
    { data: staffAccounts, error: staffError },
  ] = await Promise.all([
    admin
      .from("invoices")
      .select(
        "id,order_id,company_id,individual_customer_id,billing_period,customer_charge_total,driver_payout_total,status,created_at"
      )
      .gte("created_at", sinceIso),
    admin
      .from("orders")
      .select("id,order_no,company_id,individual_customer_id,guest_name,created_by,created_at")
      .gte("created_at", sinceIso),
    admin.from("dispatches").select("id,order_id"),
    admin
      .from("dispatch_extra_charges")
      .select("dispatch_id,category,customer_charge_amount,driver_payout_amount,correction_invoice_id,created_at")
      .eq("status", "active")
      .gte("created_at", sinceIso),
    admin
      .from("claims")
      .select("claim_type,status,claim_amount,compensation_amount,created_at")
      .gte("created_at", sinceIso),
    admin.from("staff_accounts").select("id,name"),
  ]);

  const firstError =
    invoicesError || ordersError || dispatchesError || extraChargesError || claimsError || staffError;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  const companyIds = Array.from(
    new Set(
      [
        ...(invoices || []).map((i: any) => i.company_id),
        ...(orders || []).map((o: any) => o.company_id),
      ].filter(Boolean)
    )
  );
  const individualIds = Array.from(
    new Set(
      [
        ...(invoices || []).map((i: any) => i.individual_customer_id),
        ...(orders || []).map((o: any) => o.individual_customer_id),
      ].filter(Boolean)
    )
  );

  const [{ data: companies }, { data: individualCustomers }, recurringResult] = await Promise.all([
    companyIds.length > 0
      ? admin.from("companies").select("id,name").in("id", companyIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    individualIds.length > 0
      ? admin.from("individual_customers").select("id,name").in("id", individualIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    // 정기계약 화주 수(33차 B장).
    // 🔴 **바로 위 `companies` 조회를 재사용하지 말 것** — 그쪽은 `.in("id", companyIds)` 라
    //    **최근 12개월에 거래가 있는 화주만** 담는다. 정기계약을 맺어두고 아직 첫 운송이
    //    없는 화주가 빠져 실제보다 적게 세어진다.
    // 🔴 **"활성" 판정을 SQL 로 다시 쓰지 말 것** — 종료일 당일 포함 규칙이 두 벌이 되어
    //    조용히 갈린다. `is_recurring_contract` 로만 좁혀(부분 인덱스가 그 조건이다)
    //    `isRecurringContractActive()` 한 함수로 센다. 대상이 소수라 값이 싸다.
    admin
      .from("companies")
      .select("id,name,is_recurring_contract,recurring_contract_ended_on")
      .eq("is_recurring_contract", true),
  ]);

  // 🔴 실패를 빈 명단으로 내려보내지 말 것 — 화면이 「정기계약이 하나도 없다」로 읽는다.
  //    ⚠️ 위 6개 조회처럼 400으로 끊지 않는 것은 의도다. 부차 지표 하나 때문에 대시보드
  //    전체가 안 뜨면 손해가 더 크다. 대신 null 로 내려보내고 화면이 「조회 실패」를 쓴다.
  // 🔴 **개수를 따로 내려보내지 말 것** — 명단 길이가 곧 개수다. 두 값을 나눠 보내면
  //    「3개인데 명단은 2줄」처럼 조용히 어긋난다(실사용 리뷰에서 명단 요청이 들어와
  //    개수만 있던 구조를 명단으로 바꾼 것이다).
  const recurringContractCompanies = recurringResult.error
    ? null
    : (recurringResult.data || [])
        .filter((c: any) => isRecurringContractActive(c))
        .map((c: any) => ({
          id: c.id as string,
          name: (c.name || "(이름 없음)") as string,
          endedOn: (c.recurring_contract_ended_on || null) as string | null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  const recurringContractError = recurringResult.error ? recurringResult.error.message : null;

  // 현장 추가비를 오더의 "가장 최근 invoice"에 귀속(로드맵③ 3규칙, lib/dashboardExtraChargeAgg.ts)
  const extraChargeAttributionByInvoiceId = attributeActiveExtraCharges(
    (extraCharges || []) as any,
    (dispatches || []) as any,
    (invoices || []).map((i: any) => ({ id: i.id, order_id: i.order_id, created_at: i.created_at }))
  );

  // 카테고리별 현장 추가비 집계(4번 섹션용 — invoice 귀속 여부와 무관하게 발생 자체를 집계)
  const extraChargeByCategory: Record<
    string,
    { count: number; customerAmount: number; driverAmount: number }
  > = {};
  (extraCharges || []).forEach((e: any) => {
    const cur = extraChargeByCategory[e.category] || { count: 0, customerAmount: 0, driverAmount: 0 };
    cur.count += 1;
    cur.customerAmount += e.customer_charge_amount || 0;
    cur.driverAmount += e.driver_payout_amount || 0;
    extraChargeByCategory[e.category] = cur;
  });

  return NextResponse.json({
    invoices: invoices || [],
    orders: orders || [],
    claims: claims || [],
    companies: companies || [],
    individualCustomers: individualCustomers || [],
    staffAccounts: staffAccounts || [],
    extraChargeAttributionByInvoiceId,
    extraChargeByCategory,
    recurringContractCompanies,
    recurringContractError,
  });
}

// 이 API는 /api/admin/... 경로라 middleware.ts(matcher: "/admin/:path*")의 적용
// 대상이 아니므로(middleware.ts 하단 주석 참고), role 체크를 반드시 이 파일
// 안에서 직접 해야 함 — /admin/dashboard 페이지가 middleware로 막혀 있다는
// 것만 믿고 이 API를 무방비로 두면 안 됨.

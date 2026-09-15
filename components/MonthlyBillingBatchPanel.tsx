"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchExtraChargesByDispatchIds } from "@/lib/fetchDispatchExtraCharges";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import { getBillingBatchReasonLabel } from "@/lib/billingBatchReasons";
import { monthToPeriod, monthLabelForDate, monthRangeOf } from "@/lib/billingPeriod";
import {
  calcPaymentDueDate,
  describePaymentDue,
  isPeriodClosed,
  isPastDue,
  type PaymentDueSetting,
} from "@/lib/paymentDueDate";

// 로드맵 ②-B: 정산관리 "월정산 묶음" 탭(작업지시서 6-1). 화주+기간(월 단위)을
// 고르면 그 조합의 묶음(draft/confirmed/cancelled)을 조회하고, draft면
// 후보(broker+monthly+정산대기 상태) invoice를 담아 확정까지 진행한다.
// 모든 쓰기는 app/api/admin/billing-batches/* 서버 API(서비스 롤 RPC)를
// 거치고, 조회는 기존 admin 패턴대로 anon 클라이언트 직접 조회.

type Company = { id: string; name: string };

type Batch = {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  batch_status: "draft" | "confirmed" | "cancelled";
  tax_invoice_status: "not_issued" | "issued";
  tax_invoice_issued_at: string | null;
  payment_status: "unpaid" | "paid" | "overdue";
  payment_due_date: string | null;
  paid_at: string | null;
  supply_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  cancel_reason: string | null;
  confirmed_by_name_snapshot: string | null;
  cancelled_by_name_snapshot: string | null;
};

type CandidateRow = {
  invoice_id: string;
  company_id: string;
  billing_period: string | null;
  customer_charge_total: number | null;
  order_id: string | null;
  settlement_reference_date: string | null;
};

type AllCandidateRow = CandidateRow & { company_name: string; order_no: string; cycle_month: string };

type ActiveItem = {
  id: string;
  invoice_id: string;
  supply_amount_snapshot: number;
  vat_amount_snapshot: number;
  total_amount_snapshot: number;
};

// 🔴 **묶음 안에 견적·운송 정보가 없던 것이 사용자 신고의 절반이다**(2026-09-15 —
//    *"이 묶음안에서 견적부분이나 정산부분 결제일 부분이 표시가 되어야"*).
//    그전에는 항목 줄에 오더번호와 금액 세 칸뿐이라, 담당자가 어느 운송 건인지
//    확인하려면 줄마다 정산 상세로 들어갔다 나와야 했다.
type OrderInfo = {
  order_no: string;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  requested_pickup_at: string | null;
};

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

/** 상차일시 → 「9/12 14:30」. 묶음 항목 줄은 좁아서 연도를 빼고 월/일만 쓴다. */
function shortDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** 주소를 구간 칸에 맞게 줄인다 — 시·군·구까지만 남기면 어디에서 어디로인지 읽힌다. */
function shortPlace(v: string | null | undefined) {
  if (!v) return "-";
  const parts = v.trim().split(/\s+/);
  return parts.slice(0, 2).join(" ") || "-";
}

/**
 * 묶음 항목 한 줄의 **운송 정보 칸**. 🔴 draft 표와 확정 표가 **같은 부품**을 쓴다 —
 * 따로 적으면 확정한 뒤에 보이는 정보가 조용히 달라진다(한쪽만 고치게 된다).
 */
function ItemTransportCells({ info }: { info: OrderInfo | undefined }) {
  return (
    <>
      {/* 🔴 `nowrap` 을 빼지 말 것 — 좁은 화면에서 표가 줄어들면서 주소가
          **한 글자씩** 끊겼다(390px 에서 실제로 그랬다). 표 자체에 `minWidth` 가
          있어서 안 줄고 가로로 스크롤된다. */}
      <td style={{ whiteSpace: "nowrap" }}>{shortDateTime(info?.requested_pickup_at)}</td>
      <td style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
        {shortPlace(info?.origin)} → {shortPlace(info?.destination)}
      </td>
      <td style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
        {info?.vehicle_type || "-"}
        {info?.item ? (
          <span style={{ color: "var(--text-muted)" }}> · {info.item}</span>
        ) : null}
      </td>
    </>
  );
}

/** 묶음 항목 표의 운송 정보 머리 3칸 — 위 부품과 **짝이다**(칸 수가 어긋나면 표가 밀린다). */
function ItemTransportHeads() {
  return (
    <>
      <th>상차일시</th>
      <th>구간</th>
      <th>차량 · 품목</th>
    </>
  );
}

function currentMonthInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 🔴 기간 계산(`monthToPeriod`·`monthLabelForDate`·`monthRangeOf`)은
//    **`lib/billingPeriod.ts` 로 옮겼다**(2026-09-15). 묶음 자동 생성 서버 API 가
//    같은 기간을 계산해야 하는데, 화면과 서버가 각자 계산하면 손으로 만든 묶음과
//    자동으로 만들어진 묶음의 기간이 어긋나 같은 달에 묶음이 둘이 된다.
//    🔴 **이 파일에 다시 적지 말 것.**

async function callBatchApi(path: string, body: Record<string, any>) {
  // 🔴 **왜 실패했는지가 화면에 남아야 한다.** 그전에는 서버가 401/500 을 주고
  //    본문이 JSON 이 아니면 `reason: "unknown"` 하나로 뭉개져서
  //    「처리할 수 없습니다. (unknown)」만 떴다 — 로그인이 풀린 것인지, 서버 키가
  //    Preview 에 없는 것인지(자주 겪는 함정이다), 진짜 거절인지 가릴 수 없었다.
  let res: Response;
  try {
    res = await fetch(`/api/admin/billing-batches/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    return { success: false, error: `서버에 연결하지 못했습니다: ${e?.message || e}` };
  }
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    return {
      success: false,
      error:
        data?.error ||
        (res.status === 401
          ? "로그인이 만료되었습니다. 새로고침 후 다시 로그인해주세요. (401)"
          : `서버가 요청을 거절했습니다. (HTTP ${res.status})`),
    };
  }
  return data;
}

export default function MonthlyBillingBatchPanel({
  initialCompanyId = "",
  initialMonth = "",
}: {
  initialCompanyId?: string;
  initialMonth?: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [month, setMonth] = useState(initialMonth || currentMonthInput());
  const [batch, setBatch] = useState<Batch | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [orderInfoByInvoiceId, setOrderInfoByInvoiceId] = useState<Record<string, OrderInfo>>({});
  const [loading, setLoading] = useState(false);
  /**
   * 🔴 **오류는 「누른 자리」에 떠야 한다**(원칙 33번 · PR #153 이 운송오더에서 겪은 것과
   *    같은 자리). 처음에는 이 패널 **맨 위 한 곳**에만 그렸는데, 「새 묶음 만들기」는
   *    화면 맨 아래 접힌 칸이고 묶음 상세는 중간이라, 실패 메시지가 **1000px 위**에
   *    떠서 담당자에게는 「눌렀는데 아무 일도 안 일어난다」로 보였다
   *    (실사용 리뷰 3라운드 — *"새 묶음 만들기가 안되고 역시 담기도 안된다"*).
   * 🔴 `scope` 를 빼고 한 곳으로 되돌리지 말 것.
   */
  const [actionError, setActionError] = useState<{
    scope: "top" | "batch" | "create";
    message: string;
  } | null>(null);

  function fail(scope: "top" | "batch" | "create", message: string) {
    setActionError({ scope, message });
  }

  /** 그 자리에 뜨는 오류 줄. 🔴 어느 자리든 **같은 모양**이어야 한다. */
  function ErrorLine({ scope }: { scope: "top" | "batch" | "create" }) {
    if (!actionError || actionError.scope !== scope) return null;
    return (
      <div className="error-box" style={{ margin: "10px 0", fontSize: 13 }}>
        오류: {actionError.message}
      </div>
    );
  }
  const [releaseReason, setReleaseReason] = useState("");
  const [showReleaseReason, setShowReleaseReason] = useState(false);
  const [forceDeleteReason, setForceDeleteReason] = useState("");
  const [showForceDeleteReason, setShowForceDeleteReason] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);
  // 🔴 「전체 묶음 후보」 표를 없앴다(실사용 리뷰 1라운드 — *"오더시 월정산으로
  //    체크된건 월정산 묶음으로 자동 구성되고 따로 전체 묶음 후보는 필요없을 것
  //    같다"*). 자동으로 담기면 이 목록은 **항상 비어 있는 것이 정상**이다.
  //    🔴 **그래도 조회는 남겼다** — 자동으로 담기지 **못한** 건(그 달 묶음이 이미
  //    확정·해제됐거나 자동 처리가 실패한 경우)이 생기면 아무 화면에도 안 나타나
  //    조용히 청구에서 빠진다. 대신 **0건이면 아무것도 그리지 않고**, 있을 때만
  //    한 줄 경고로 뜬다. 🔴 표와 「선택」 버튼으로 되돌리지 말 것.
  const [orphans, setOrphans] = useState<AllCandidateRow[]>([]);
  // 🔴 **작성 중 묶음에는 `total_amount` 가 없다** — 확정할 때 채워지는 컬럼이라,
  //    목록의 금액 칸이 작성 중인 묶음마다 `-` 로 비어 있었다(렌더링해 보고 발견).
  //    목록이 이제 기본 화면이라 가장 흔한 상태의 금액이 안 보이면 쓸모가 없다.
  //    담긴 항목의 스냅샷 합계를 따로 세서 보여준다.
  //    🔴 확정된 묶음에는 쓰지 말 것 — 그쪽은 확정 시점에 **얼려진** 값이 정본이다.
  const [aggByBatchId, setAggByBatchId] = useState<
    Record<string, { count: number; supply: number; total: number }>
  >({});
  // 「새 묶음 만들기」에서 고른 화주·정산월의 상태. 🔴 펼친 묶음(`batch`)과 **다른
  //    상태다** — 섞으면 목록에서 펼친 묶음이 검색창 값에 따라 바뀐다.
  // 🔴 「불러오는 중」과 「불러오지 못했다」를 구분한다 — 그전에는 둘 다 `null` 이라
  //    **화면에 아무것도 안 그려졌고**, 그래서 「새 묶음 만들기가 안된다」가 됐다
  //    (실사용 리뷰 3라운드). 🔴 **아무것도 안 그리는 분기를 다시 만들지 말 것.**
  const [createLoading, setCreateLoading] = useState(false);
  const [createTarget, setCreateTarget] = useState<{
    existing: Batch | null;
    candidateCount: number;
    cutoffDay: number | null;
    period: { period_start: string; period_end: string };
  } | null>(null);
  const [companyCutoffDay, setCompanyCutoffDay] = useState<number | null>(null);
  // 화주 거래조건의 결제일 설정(36차 A장) — 납부기한 계산·안내에 쓴다
  const [companyPaymentDue, setCompanyPaymentDue] = useState<PaymentDueSetting | null>(null);
  // 로드맵③ 현장 추가비 — draft 묶음 항목 중 스냅샷 새로고침이 필요한 항목
  const [needsRefreshByItemId, setNeedsRefreshByItemId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
    loadRecentBatches();
    loadOrphans();
    if (initialCompanyId) {
      supabase
        .from("companies")
        .select("id,name")
        .eq("id", initialCompanyId)
        .maybeSingle()
        .then(({ data }) => data && setSelectedCompany(data as Company));
      // 🔴 **정산 상세에서 들어오는 깊은 링크를 살려 둔다**
      //    (`/admin/invoices/[id]` 의 「월정산 묶음 보기」 → `?tab=monthly&company=..&month=..`).
      //    그전에는 화주·정산월이 주어지면 그 묶음 상세가 **바로 열렸다.** 목록
      //    아코디언으로 바꾸면서 그냥 두면 「눌렀는데 목록만 뜬다」가 된다.
      if (initialMonth) openInitialBatch(initialCompanyId, initialMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 깊은 링크로 들어왔을 때 그 화주·정산월의 묶음을 찾아 펼친다. */
  async function openInitialBatch(targetCompanyId: string, targetMonth: string) {
    // 🔴 기간 완전일치로 찾지 말 것(원칙 46번) — `period_end` 가 그 달력월 안인지로 찾는다.
    const { start, end } = monthRangeOf(targetMonth);
    const { data, error } = await supabase
      .from("customer_billing_batches")
      .select(BATCH_SELECT)
      .eq("company_id", targetCompanyId)
      .gte("period_end", start)
      .lte("period_end", end)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    // 🔴 못 찾아도 오류가 아니다 — 아직 묶음이 없는 달일 수 있다(아래 「새 묶음
    //    만들기」가 그 화주·정산월로 이미 채워져 있다).
    if (error || !data) return;
    await openBatchRow(data as any);
  }

  // 화주 업체 검색(admin/orders의 화주 검색과 동일한 패턴) — 업체 수가
  // 많아지면 드롭다운을 스크롤하며 찾아야 해서 불편하다는 실사용 피드백으로
  // 전체 목록 대신 이름 검색 방식으로 교체
  useEffect(() => {
    let active = true;
    async function search() {
      if (companySearch.trim().length < 1) {
        setCompanyResults([]);
        return;
      }
      const { data } = await supabase
        .from("companies")
        .select("id,name")
        .ilike("name", `%${companySearch}%`)
        .order("name", { ascending: true })
        .limit(8);
      if (active) setCompanyResults((data as Company[]) || []);
    }
    const t = setTimeout(search, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [companySearch]);

  async function loadRecentBatches() {
    const { data, error } = await supabase
      .from("customer_billing_batches")
      .select(
        "id,company_id,period_start,period_end,batch_status,tax_invoice_status,tax_invoice_issued_at,payment_status,payment_due_date,paid_at,supply_amount,vat_amount,total_amount,cancel_reason,confirmed_by_name_snapshot,cancelled_by_name_snapshot,companies(name)"
      )
      .order("period_start", { ascending: false })
      .limit(30);
    // 🔴 `error` 를 버리면 조회 실패가 「묶음이 하나도 없습니다」로 보인다(원칙 55번).
    if (error) {
      fail("top", `묶음 목록을 불러오지 못했습니다: ${error.message}`);
      return;
    }
    const list = (data as any[]) || [];
    setRecentBatches(list as any);

    // 🔴 **목록의 모든 묶음**을 집계한다(작성 중만이 아니다) — 펼치기 전에도 건수를
    //    보여줘야 하기 때문이다(사용자 지시 2026-09-15 *"몇건인지?"*).
    //    🔴 확정된 묶음의 **금액**은 얼려진 `supply_amount`/`total_amount` 가 정본이고,
    //       여기서 세는 것은 **건수뿐**이다. 항목 합계로 확정 금액을 덮어쓰지 말 것.
    const ids = list.map((b) => b.id);
    if (ids.length === 0) {
      setAggByBatchId({});
      return;
    }
    const { data: items, error: itemError } = await supabase
      .from("customer_billing_batch_items")
      .select("batch_id,supply_amount_snapshot,total_amount_snapshot")
      .in("batch_id", ids)
      .is("released_at", null);
    if (itemError) {
      fail("top", `묶음 금액을 불러오지 못했습니다: ${itemError.message}`);
      return;
    }
    const agg: Record<string, { count: number; supply: number; total: number }> = {};
    ((items as any[]) || []).forEach((it) => {
      const a = (agg[it.batch_id] ||= { count: 0, supply: 0, total: 0 });
      a.count += 1;
      a.supply += it.supply_amount_snapshot || 0;
      a.total += it.total_amount_snapshot || 0;
    });
    setAggByBatchId(agg);
  }

  // 화주를 하나씩 찾아서 확인하지 않아도 조건에 맞는 후보(주선사정산·월정산·
  // 정산대기, 아직 어느 묶음에도 안 담긴 건)가 전체 화주 기준으로 한눈에
  // 보이도록 함(PR #64 실사용 피드백) — customer_billing_batch_candidates
  // 뷰는 회사명/오더번호가 없어서 별도로 조회해 붙여줌
  async function loadOrphans() {
    const { data: rows } = await supabase
      .from("customer_billing_batch_candidates")
      .select("invoice_id,company_id,billing_period,customer_charge_total,order_id,settlement_reference_date")
      .order("settlement_reference_date", { ascending: false })
      .limit(200);
    const list = (rows as CandidateRow[]) || [];
    if (list.length === 0) {
      setOrphans([]);
      return;
    }

    const companyIds = Array.from(new Set(list.map((r) => r.company_id).filter(Boolean)));
    const orderIds = Array.from(new Set(list.map((r) => r.order_id).filter(Boolean))) as string[];
    const [{ data: companiesData }, { data: ordersData }] = await Promise.all([
      companyIds.length
        ? supabase.from("companies").select("id,name,billing_cutoff_day").in("id", companyIds)
        : Promise.resolve({ data: [] as any[] }),
      orderIds.length
        ? supabase.from("orders").select("id,order_no").in("id", orderIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const companyNameById: Record<string, string> = {};
    const cutoffDayById: Record<string, number | null> = {};
    (companiesData || []).forEach((c: any) => {
      companyNameById[c.id] = c.name;
      cutoffDayById[c.id] = c.billing_cutoff_day ?? null;
    });
    const orderNoById: Record<string, string> = {};
    (ordersData || []).forEach((o: any) => (orderNoById[o.id] = o.order_no || "-"));

    setOrphans(
      list.map((r) => ({
        ...r,
        company_name: companyNameById[r.company_id] || "-",
        order_no: r.order_id ? orderNoById[r.order_id] || "-" : "-",
        cycle_month: r.settlement_reference_date
          ? monthLabelForDate(r.settlement_reference_date, cutoffDayById[r.company_id] ?? null)
          : "-",
      }))
    );
  }

  async function refreshOverview() {
    await loadRecentBatches();
    await loadOrphans();
  }

  /** 화주 거래조건을 fresh 로 읽어 화면 state 에 넣고 그 값을 돌려준다. */
  async function loadCompanyTerms(
    targetCompanyId: string,
    scope: "top" | "batch" | "create" = "batch"
  ) {
    const { data, error } = await supabase
      .from("companies")
      .select("billing_cutoff_day,payment_due_basis,payment_due_value")
      .eq("id", targetCompanyId)
      .maybeSingle();
    if (error) {
      // 🔴 조회 실패를 조용히 넘기지 말 것(원칙 55번) — 그냥 넘기면 마감일이 없는
      //    것처럼 달력월로 계산해서 **엉뚱한 기간의 묶음을 만들** 수 있다.
      fail(scope, `화주 거래조건을 불러오지 못했습니다: ${error.message}`);
      return null;
    }
    return (data as any) || { billing_cutoff_day: null, payment_due_basis: null, payment_due_value: null };
  }

  const BATCH_SELECT =
    "id,company_id,period_start,period_end,batch_status,tax_invoice_status,tax_invoice_issued_at,payment_status,payment_due_date,paid_at,supply_amount,vat_amount,total_amount,cancel_reason,confirmed_by_name_snapshot,cancelled_by_name_snapshot";

  /**
   * 목록에서 묶음 한 줄을 **펼친다**(실사용 리뷰 1라운드 — *"묶음 목록에 있는 건은
   * 상세로 펼치고 접을수 있는 기능이 있어야 한다"*).
   *
   * 🔴 **그 줄을 그대로 연다** — 그전에는 화주·정산월로 「가장 최근 묶음」을 다시
   *    찾아서 열었기 때문에, 같은 달에 해제된 묶음과 새 묶음이 둘 있으면 **클릭한
   *    줄이 아닌 다른 묶음**이 열렸다.
   * 🔴 **한 번에 하나만 펼친다**(27차 견적 확인 아코디언과 같은 규칙) — 펼친 것이
   *    곧 선택된 묶음이라 state 가 하나로 끝난다.
   */
  /**
   * 목록 줄을 **누를 때**의 동작 — 열려 있으면 접고, 아니면 연다.
   * 🔴 **접기 판정은 여기에만 있다.** 그전에는 `openBatch()` 안에 있었는데,
   *    「담기」·「묶음 만들기」가 끝나고 그 묶음을 열려고 `setBatch(null)` 뒤에
   *    `openBatch()` 를 부르면 — **`batch` 는 그 핸들러가 만들어질 때의 값이라
   *    아직 옛 묶음이었다**(React state 는 그 자리에서 바뀌지 않는다). 그래서
   *    「이미 열려 있다」로 판정해 **묶음을 열지 않고 접어버렸고**, 항목 목록까지
   *    비웠다. 담당자에게는 **담았는데 안 담긴 것**으로 보였다
   *    (실사용 리뷰 4라운드 — *"「담기」나 「모두담기」를 해도 담기지 않는다"*).
   * 🔴 **핸들러에서 이 함수를 부르지 말 것** — 항상 `openBatchRow()` 를 쓴다.
   */
  async function toggleBatch(row: any) {
    if (batch?.id === row.id) {
      setBatch(null);
      setActiveItems([]);
      setCandidates([]);
      return;
    }
    await openBatchRow(row);
  }

  /** 그 묶음을 **무조건 연다**(접기 판정 없음). */
  async function openBatchRow(row: any) {
    setActionError(null);
    setShowReleaseReason(false);
    setShowForceDeleteReason(false);
    setBatch(row);
    setActiveItems([]);
    setCandidates([]);
    setLoading(true);

    const terms = await loadCompanyTerms(row.company_id);
    if (terms) {
      setCompanyCutoffDay(terms.billing_cutoff_day ?? null);
      setCompanyPaymentDue({
        payment_due_basis: terms.payment_due_basis ?? null,
        payment_due_value: terms.payment_due_value ?? null,
      });
    }

    // 🔴 저장된 납부기한이 없으면 **화주 설정으로 계산한 값을 입력칸에 미리 넣는다.**
    //    실측에서 결제일이 채워진 묶음이 0건이었던 것은 담당자가 안 넣은 것이 아니라
    //    **빈 칸 하나만 덩그러니 있어서 무엇을 넣어야 하는지 알 수 없었기 때문**이다.
    //    🔴 넣어두기만 하고 저장하지는 않는다 — 저장은 담당자가 누른다.
    //    🔴 `companyPaymentDue` state 를 읽지 말 것(같은 렌더에서는 아직 옛 값이다).
    setDueDate(row.payment_due_date || (terms ? calcPaymentDueDate(row.period_end, terms) : null) || "");

    await loadActiveItems(row.id);
    // 🔴 **묶음에 저장된 자기 기간**으로 후보를 찾는다(원칙 46번) — 화주의 현재
    //    마감일로 역산하면 설정이 바뀐 뒤에는 과거 묶음의 후보를 못 찾는다.
    if (row.batch_status !== "cancelled") {
      await loadCandidatesOnly(row.company_id, row.period_start, row.period_end);
    }
    setLoading(false);
  }

  /**
   * 🔴 **정말로 담겼는지 DB 에 다시 물어본다.** 「담았다고 했는데 안 담겼다」는
   *    신고를 두 번 받았고(실사용 리뷰 3·4라운드), 그때마다 화면은 조용했다.
   *    담기 결과를 **화면 상태로 짐작하지 말고 원본으로 확인**하면, 남은 실패가
   *    무엇이든 「안 담겼다」는 사실 자체는 반드시 눈에 보인다.
   * 🔴 이 확인을 지우지 말 것.
   */
  async function assertAttached(invoiceIds: string[], scope: "top" | "batch") {
    if (invoiceIds.length === 0) return;
    const { data, error } = await supabase
      .from("customer_billing_batch_items")
      .select("invoice_id")
      .in("invoice_id", invoiceIds)
      .is("released_at", null);
    if (error) return; // 확인 자체가 실패한 것은 담기 실패가 아니다
    const got = new Set(((data as any[]) || []).map((r) => r.invoice_id));
    const missing = invoiceIds.filter((id) => !got.has(id));
    if (missing.length > 0) {
      fail(
        scope,
        `${missing.length}건이 묶음에 담기지 않았습니다. 새로고침 후 다시 시도해주세요. ` +
          "(계속 같으면 그 정산 건이 이미 확정·잠금 상태일 수 있습니다)"
      );
    }
  }

  /** 펼쳐둔 묶음을 그대로 다시 읽는다 — 어떤 처리를 한 뒤에 쓴다. */
  async function reloadOpenBatch() {
    if (!batch) return;
    const { data, error } = await supabase
      .from("customer_billing_batches")
      .select(BATCH_SELECT)
      .eq("id", batch.id)
      .maybeSingle();
    if (error) {
      fail("batch", `묶음을 다시 불러오지 못했습니다: ${error.message}`);
      return;
    }
    if (!data) {
      // 삭제된 경우 — 접는다
      setBatch(null);
      setActiveItems([]);
      setCandidates([]);
      return;
    }
    setBatch(data as any);
    setDueDate(
      (data as any).payment_due_date ||
        calcPaymentDueDate((data as any).period_end, companyPaymentDue) ||
        ""
    );
    await loadActiveItems((data as any).id);
    if ((data as any).batch_status !== "cancelled") {
      await loadCandidatesOnly(
        (data as any).company_id,
        (data as any).period_start,
        (data as any).period_end
      );
    }
  }

  /**
   * 「새 묶음 만들기」에서 고른 화주·정산월의 상태를 읽는다.
   * 🔴 여기서 `batch` 를 건드리지 않는다 — 검색창을 만질 때마다 목록에서 펼쳐둔
   *    묶음이 바뀌면 안 된다.
   */
  async function loadCreateTarget(targetCompanyId: string, targetMonth: string) {
    setCreateTarget(null);
    if (!targetCompanyId || !targetMonth) return;
    setCreateLoading(true);
    try {
      await loadCreateTargetInner(targetCompanyId, targetMonth);
    } finally {
      setCreateLoading(false);
    }
  }

  async function loadCreateTargetInner(targetCompanyId: string, targetMonth: string) {
    const terms = await loadCompanyTerms(targetCompanyId, "create");
    if (!terms) return;
    const cutoffDay = terms.billing_cutoff_day ?? null;

    // 🔴 기존 묶음은 "현재 마감일로 역산한 기간"과 완전일치로 찾지 않는다(원칙 46번) —
    //    마감일 설정이 묶음 생성 뒤에 바뀌면 영영 못 찾는다. `period_end` 가 그
    //    달력월 안에 있는지로 찾는다.
    const { start: monthRangeStart, end: monthRangeEnd } = monthRangeOf(targetMonth);
    const { data: latest, error: latestError } = await supabase
      .from("customer_billing_batches")
      .select(BATCH_SELECT)
      .eq("company_id", targetCompanyId)
      .gte("period_end", monthRangeStart)
      .lte("period_end", monthRangeEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      fail("create", `묶음을 조회하지 못했습니다: ${latestError.message}`);
      return;
    }

    const period = latest
      ? { period_start: (latest as any).period_start, period_end: (latest as any).period_end }
      : monthToPeriod(targetMonth, cutoffDay);

    const { data: cands, error: candError } = await supabase
      .from("customer_billing_batch_candidates")
      .select("invoice_id")
      .eq("company_id", targetCompanyId)
      .gte("settlement_reference_date", period.period_start)
      .lte("settlement_reference_date", period.period_end);
    if (candError) {
      fail("create", `후보를 조회하지 못했습니다: ${candError.message}`);
      return;
    }

    setCreateTarget({
      existing: (latest as any) || null,
      candidateCount: ((cands as any[]) || []).length,
      cutoffDay,
      // 🔴 새로 만들 때 쓸 기간은 **현재 마감일 기준**이다(기존 묶음이 해제된
      //    경우에도 새 묶음은 지금 설정으로 만든다).
      period: monthToPeriod(targetMonth, cutoffDay),
    });
  }

  // 후보 판정은 billing_period 텍스트 일치가 아니라 settlement_reference_date가
  // 이 기간(period_start~period_end) 안에 있는지로 함 — 화주마다 정산
  // 마감일이 다를 수 있어서 "YYYY-MM" 한 덩어리로는 표현이 안 됨(PR #64
  // 리뷰 피드백)
  async function loadCandidatesOnly(targetCompanyId: string, periodStart: string, periodEnd: string) {
    const { data } = await supabase
      .from("customer_billing_batch_candidates")
      .select("invoice_id,company_id,billing_period,customer_charge_total,order_id,settlement_reference_date")
      .eq("company_id", targetCompanyId)
      .gte("settlement_reference_date", periodStart)
      .lte("settlement_reference_date", periodEnd);
    setCandidates((data as any) || []);
    await loadOrderInfo((data as any) || []);
  }

  async function loadActiveItems(batchId: string) {
    const { data } = await supabase
      .from("customer_billing_batch_items")
      .select("id,invoice_id,supply_amount_snapshot,vat_amount_snapshot,total_amount_snapshot")
      .eq("batch_id", batchId)
      .is("released_at", null);
    const items = (data as any as ActiveItem[]) || [];
    setActiveItems(items);
    await loadOrderInfo(items.map((i) => ({ invoice_id: i.invoice_id })) as any);
    await loadNeedsRefreshInfo(items);
  }

  // 로드맵③ 현장 추가비 — draft 묶음 항목의 invoice 생성 이후 새로 등록된
  // 활성 추가비가 있으면 "스냅샷 새로고침 필요" 배지를 보여줌(3-3). 확정된
  // 묶음(activeItems가 confirmed 케이스로 로드된 경우)은 새로고침 대상이
  // 아니므로 draft일 때만 호출됨(handleRefreshItemSnapshot도 draft 전용)
  async function loadNeedsRefreshInfo(items: ActiveItem[]) {
    const invoiceIds = items.map((i) => i.invoice_id).filter(Boolean);
    if (invoiceIds.length === 0) {
      setNeedsRefreshByItemId({});
      return;
    }
    const { data: invs } = await supabase
      .from("invoices")
      .select("id,order_id,created_at")
      .in("id", invoiceIds);
    const orderIds = ((invs as any[]) || []).map((i) => i.order_id).filter(Boolean);
    if (orderIds.length === 0) {
      setNeedsRefreshByItemId({});
      return;
    }
    const { data: dispatchRows } = await supabase
      .from("dispatches")
      .select("id,order_id")
      .in("order_id", orderIds);
    const dispatchIdByOrderId: Record<string, string> = {};
    (dispatchRows || []).forEach((d: any) => {
      if (d.order_id) dispatchIdByOrderId[d.order_id] = d.id;
    });
    const dispatchIds = Object.values(dispatchIdByOrderId);
    if (dispatchIds.length === 0) {
      setNeedsRefreshByItemId({});
      return;
    }
    // 19차 — 차주 지급액이 authenticated 롤에서 회수돼 있어 서버 API로 조회한다
    const extraRows = (await fetchExtraChargesByDispatchIds(dispatchIds)).filter(
      (e) => e.status === "active" && !e.correction_invoice_id
    );

    const invoiceById: Record<string, { order_id: string | null; created_at: string }> = {};
    ((invs as any[]) || []).forEach((i) => (invoiceById[i.id] = i));

    const result: Record<string, boolean> = {};
    items.forEach((item) => {
      const inv = invoiceById[item.invoice_id];
      if (!inv || !inv.order_id) return;
      const dispatchId = dispatchIdByOrderId[inv.order_id];
      if (!dispatchId) return;
      const hasNewExtra = extraRows.some(
        (e: any) => e.dispatch_id === dispatchId && new Date(e.created_at) > new Date(inv.created_at)
      );
      if (hasNewExtra) result[item.id] = true;
    });
    setNeedsRefreshByItemId(result);
  }

  async function handleRefreshItemSnapshot(itemId: string) {
    setActionError(null);
    const res = await fetch("/api/admin/billing-batches/refresh-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId }),
    });
    const result = await res.json().catch(() => ({}));
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    if (batch) {
      await reloadOpenBatch();
    }
  }

  // 🔴 오더번호만 가져오던 것을 **운송 정보까지** 가져오도록 넓혔다(2026-09-15).
  //    🔴 `error` 를 받아서 화면에 띄운다(원칙 55번) — 그전에는 `const { data }` 라
  //       조회가 실패하면 항목 줄의 오더번호가 조용히 전부 `-` 가 됐다.
  async function loadOrderInfo(rows: { invoice_id: string }[]) {
    const ids = rows.map((r) => r.invoice_id).filter(Boolean);
    if (ids.length === 0) return;
    const { data: invs, error: invError } = await supabase
      .from("invoices")
      .select("id,order_id")
      .in("id", ids);
    if (invError) {
      fail("batch", `운송 정보를 불러오지 못했습니다: ${invError.message}`);
      return;
    }
    const orderIds = ((invs as any[]) || []).map((i) => i.order_id).filter(Boolean);
    if (orderIds.length === 0) return;
    const { data: orders, error: orderError } = await supabase
      .from("orders")
      .select("id,order_no,origin,destination,vehicle_type,item,requested_pickup_at")
      .in("id", orderIds);
    if (orderError) {
      fail("batch", `운송 정보를 불러오지 못했습니다: ${orderError.message}`);
      return;
    }
    const infoByOrderId: Record<string, OrderInfo> = {};
    ((orders as any[]) || []).forEach((o) => {
      infoByOrderId[o.id] = {
        order_no: o.order_no || "-",
        origin: o.origin,
        destination: o.destination,
        vehicle_type: o.vehicle_type,
        item: o.item,
        requested_pickup_at: o.requested_pickup_at,
      };
    });
    const map: Record<string, OrderInfo> = {};
    ((invs as any[]) || []).forEach((i) => {
      if (i.order_id && infoByOrderId[i.order_id]) map[i.id] = infoByOrderId[i.order_id];
    });
    setOrderInfoByInvoiceId((prev) => ({ ...prev, ...map }));
  }

  useEffect(() => {
    loadCreateTarget(companyId, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, month]);

  async function handleCreateBatch() {
    // 🔴 조용히 돌아가지 말 것 — 그전에는 `if (!createTarget) return;` 이라
    //    버튼을 눌러도 **아무 일도 안 일어나고 이유도 안 보였다.**
    if (!createTarget) {
      fail("create", "화주 거래조건을 아직 불러오지 못했습니다. 화주를 다시 선택해주세요.");
      return;
    }
    setActionError(null);
    const { period_start, period_end } = createTarget.period;
    const result = await callBatchApi("create", { company_id: companyId, period_start, period_end });
    if (!result.success) {
      fail("create", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await refreshOverview();
    await loadCreateTarget(companyId, month);
    // 🔴 만든 묶음을 **바로 펼친다** — 만들고 나서 목록에서 다시 찾아 눌러야 하면
    //    「만들었는데 아무 일도 안 일어난다」로 읽힌다.
    const { data: created } = await supabase
      .from("customer_billing_batches")
      .select(BATCH_SELECT)
      .eq("id", result.batch_id)
      .maybeSingle();
    if (created) {
      await openBatchRow(created as any);
    }
  }

  /**
   * 이 묶음 기간의 **담기지 않은 건을 한 번에 담는다.**
   * 🔴 줄마다 「추가」 버튼을 두던 것을 없앴다(실사용 리뷰 1라운드 —
   *    *"「추가」 버튼과 「확정전 미리보기」 버튼은 기능상 불필요해 보인다"*).
   *    이제 운송완료 시점에 자동으로 담기므로, 여기 남는 건은 **자동 처리가
   *    닿지 못한 건**뿐이고 그것은 골라 담을 이유가 없다 — 전부 담으면 된다.
   * 🔴 **버튼 자체를 없애지는 않았다** — 없애면 자동 처리가 실패한 건을 묶음에
   *    넣을 길이 하나도 남지 않아 조용히 청구에서 빠진다. 담을 것이 0건이면
   *    이 버튼은 아예 그려지지 않는다.
   */
  async function handleAddAllCandidates() {
    if (!batch) return;
    setActionError(null);
    const targets = availableCandidates.map((c) => c.invoice_id);
    const failed: string[] = [];
    for (const invoiceId of targets) {
      const result = await callBatchApi("add-item", { batch_id: batch.id, invoice_id: invoiceId });
      if (!result.success) {
        failed.push(result.error || getBillingBatchReasonLabel(result.reason));
      }
    }
    if (failed.length > 0) {
      // 🔴 한 건이 실패해도 나머지는 담긴다 — 통째로 멈추면 담당자가 무엇이
      //    담겼는지 알 수 없다. 실패한 이유는 한 번만 모아 보여준다.
      fail("batch", `${failed.length}건을 담지 못했습니다: ${Array.from(new Set(failed)).join(" / ")}`);
    } else {
      await assertAttached(targets, "batch");
    }
    await reloadOpenBatch();
    await refreshOverview();
  }

  /**
   * 자동으로 담기지 못한 정산 건 **한 건을 그 자리에서 담는다.**
   *
   * 🔴 사용자 질문에서 나왔다(실사용 리뷰 2라운드 — *"기존에 있던 오더는 다시
   *    담을수 없나?"*). 자동 담기는 **정산 건이 새로 만들어질 때**만 도는 것이라,
   *    이 기능이 생기기 전에 이미 있던 건은 영영 담기지 않는다. 그런데 화면은
   *    「어디로 가서 무엇을 누르라」고 글로만 안내하고 있었고, 그나마 그 안내가
   *    가리키는 버튼 이름이 실제와 달랐다(「담기지 않은 건 담기」 vs 「모두 담기」).
   *    🔴 **안내만 하고 길을 안 주면 그 줄은 경고가 아니라 잔소리다.**
   *
   * 🔴 없앤 「선택」 버튼을 되살린 것이 아니다 — 그것은 검색창 두 개를 바꿔줄 뿐
   *    (그래서 *"기능도 애매하다"*) 담는 일은 담당자가 따로 해야 했다. 이것은
   *    **누르면 담긴다.**
   *
   * 묶음이 없으면 만들고, 이미 확정·해제된 달이면 **보충 묶음**을 만들지 물어본다
   * (자동 담기가 그 경우를 건너뛰는 것과 같은 이유 — 확정된 금액을 담당자 모르게
   * 건드리지 않는다. 다만 **담당자가 직접 누른 것**이면 이야기가 다르다).
   */
  async function handleAttachOrphan(orphan: AllCandidateRow) {
    setActionError(null);
    const res = await fetch("/api/admin/billing-batches/auto-attach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: orphan.invoice_id }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      fail("top", result?.error || "묶음에 담지 못했습니다.");
      return;
    }

    let batchId: string | null = result?.batch_id || null;

    if (!result?.attached) {
      if (result?.reason === "batch_not_draft") {
        // 🔴 그 달 묶음이 이미 확정·해제됐다 — 보충 묶음이 필요하다.
        if (
          !confirm(
            `${orphan.cycle_month} 묶음은 이미 확정되었거나 해제된 상태입니다.\n` +
              "확정된 묶음의 금액은 그대로 두고, 이 건을 담을 보충 묶음을 새로 만들까요?"
          )
        )
          return;
        const terms = await loadCompanyTerms(orphan.company_id);
        if (!terms) return;
        const period = monthToPeriod(orphan.cycle_month, terms.billing_cutoff_day ?? null);
        const created = await callBatchApi("create", {
          company_id: orphan.company_id,
          period_start: period.period_start,
          period_end: period.period_end,
        });
        if (!created.success) {
          fail("top", created.error || getBillingBatchReasonLabel(created.reason));
          return;
        }
        batchId = created.batch_id;
        const added = await callBatchApi("add-item", {
          batch_id: batchId,
          invoice_id: orphan.invoice_id,
        });
        if (!added.success) {
          fail("top", added.error || getBillingBatchReasonLabel(added.reason));
          return;
        }
      } else {
        fail("top", 
          result?.reason
            ? `묶음에 담지 못했습니다: ${getBillingBatchReasonLabel(result.reason)}`
            : "묶음에 담지 못했습니다."
        );
        return;
      }
    }

    await assertAttached([orphan.invoice_id], "top");
    await refreshOverview();
    // 🔴 담은 묶음을 **바로 펼친다** — 어디에 담겼는지 보여줘야 담당자가 확인한다.
    if (batchId) {
      const { data: row } = await supabase
        .from("customer_billing_batches")
        .select(BATCH_SELECT)
        .eq("id", batchId)
        .maybeSingle();
      if (row) {
        await openBatchRow(row as any);
      }
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("remove-item", { batch_id: batch.id, item_id: itemId });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await reloadOpenBatch();
  }

  async function handleDeleteBatch() {
    if (!batch) return;
    const msg =
      batch.batch_status === "draft"
        ? "이 작성 중인 묶음을 삭제할까요? 담긴 항목도 모두 제거됩니다."
        : "해제(취소)된 이 묶음 기록을 완전히 삭제할까요? 되돌릴 수 없습니다.";
    if (!confirm(msg)) return;
    setActionError(null);
    const result = await callBatchApi("delete", { batch_id: batch.id });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await reloadOpenBatch();
    await refreshOverview();
  }


  // 확정 화면 안에서 바로 완전삭제(관리자 전용) — 정상 해제(release)는
  // 세금계산서 발행/입금 처리가 시작되면 막혀있는데, 테스트 중 만든 기록을
  // 정리할 수 있어야 한다는 실사용 피드백(PR #64)으로 추가.
  async function handleForceDelete() {
    if (!batch) return;
    if (!forceDeleteReason.trim()) {
      fail("batch", "삭제 사유를 입력해주세요.");
      return;
    }
    if (
      !confirm(
        "이 확정된 묶음을 완전삭제할까요? 담긴 정산 건은 개별 정산(정산대기)으로 되돌아가고, 세금계산서·입금 처리 기록은 사라집니다. 되돌릴 수 없습니다."
      )
    )
      return;
    setActionError(null);
    const result = await callBatchApi("force-delete", { batch_id: batch.id, reason: forceDeleteReason });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    setShowForceDeleteReason(false);
    setForceDeleteReason("");
    await reloadOpenBatch();
    await refreshOverview();
  }

  async function handleConfirm() {
    if (!batch) return;
    if (!confirm("이 묶음을 확정할까요? 확정 후에는 담긴 정산 건을 개별 화면에서 수정할 수 없습니다.")) return;
    setActionError(null);
    const result = await callBatchApi("confirm", { batch_id: batch.id });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await reloadOpenBatch();
    await refreshOverview();
  }

  async function handleRelease() {
    if (!batch) return;
    if (!releaseReason.trim()) {
      fail("batch", "해제 사유를 입력해주세요.");
      return;
    }
    setActionError(null);
    const result = await callBatchApi("release", { batch_id: batch.id, reason: releaseReason });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    setShowReleaseReason(false);
    setReleaseReason("");
    await reloadOpenBatch();
    await refreshOverview();
  }

  async function handleMarkTaxInvoiceIssued() {
    if (!batch) return;
    setActionError(null);
    const result = await callBatchApi("mark-tax-invoice-issued", { batch_id: batch.id });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await reloadOpenBatch();
    await refreshOverview();
  }

  async function handleMarkPaymentReceived() {
    if (!batch) return;
    if (!confirm("이 묶음에 담긴 모든 정산 건을 입금완료 처리할까요?")) return;
    setActionError(null);
    const result = await callBatchApi("mark-payment-received", { batch_id: batch.id });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await reloadOpenBatch();
    await refreshOverview();
  }

  async function handleSetDueDate() {
    if (!batch || !dueDate) return;
    setActionError(null);
    const result = await callBatchApi("set-payment-due-date", { batch_id: batch.id, due_date: dueDate });
    if (!result.success) {
      fail("batch", result.error || getBillingBatchReasonLabel(result.reason));
      return;
    }
    await reloadOpenBatch();
    await refreshOverview();
  }

  const activeTotal = activeItems.reduce((sum, i) => sum + (i.total_amount_snapshot || 0), 0);
  const activeSupply = activeItems.reduce((sum, i) => sum + (i.supply_amount_snapshot || 0), 0);
  const activeVat = activeItems.reduce((sum, i) => sum + (i.vat_amount_snapshot || 0), 0);
  const activeInvoiceIds = new Set(activeItems.map((i) => i.invoice_id));
  const availableCandidates = candidates.filter((c) => !activeInvoiceIds.has(c.invoice_id));

  // 🔴 **마감·납부기한은 표시 시점에 다시 센다**(35차 마진 · 36차 미수금과 같은 수법).
  //    연체는 매일 도는 작업(`scripts/mark-overdue.sql`)이 `payment_status` 에도
  //    남기지만, **화면이 그 컬럼만 믿으면 안 된다** — 납부기한이 지난 그 순간부터
  //    다음 실행까지 최대 하루가 비고, GitHub 은 저장소가 60일 조용하면 예약 실행을
  //    스스로 끈다(`purge.yml` 머리에 적혀 있는 사실이다). 그때도 화면은 맞아야 한다.
  //    🔴 **둘을 반대로 만들지 말 것** — 컬럼은 기록이고 화면은 계산이다.
  const batchPeriodClosed = batch ? isPeriodClosed(batch.period_end) : false;
  const batchDueDate = batch
    ? batch.payment_due_date || calcPaymentDueDate(batch.period_end, companyPaymentDue)
    : null;
  const batchDueIsComputed = !!batch && !batch.payment_due_date && !!batchDueDate;
  const batchOverdue =
    !!batch &&
    batch.batch_status === "confirmed" &&
    batch.payment_status !== "paid" &&
    (batch.payment_status === "overdue" || isPastDue(batch.payment_due_date));


  /**
   * 펼친 묶음의 속. 🔴 상태(작성중·확정·해제)마다 **보여줄 것과 누를 것이 다르다.**
   * 🔴 컴포넌트 밖으로 빼지 말 것 — state 를 그대로 읽으려고 안에 둔 것이고,
   *    밖으로 빼면 인자를 20개쯤 넘겨야 한다.
   */
  function BatchDetail() {
    if (!batch) return null;
    const draft = batch.batch_status === "draft";
    const confirmed = batch.batch_status === "confirmed";
    const cancelled = batch.batch_status === "cancelled";

    return (
      <>
        {/* 🔴 묶음 안에서 난 오류는 **여기**에 뜬다 — 맨 위에만 그리면 담당자가
            누른 버튼에서 한참 떨어진 곳에 떠서 「눌러도 아무 일이 없다」가 된다
            (원칙 33번 · 실사용 리뷰 3라운드). */}
        <ErrorLine scope="batch" />

        {/* 🔴 **정산 일정** — 사용자 신고 *"결제일 부분이 표시가 되어야 하고 실제
            정산마감일이 지나고 어떻게 진행되는지도 알아야 한다"*(2026-09-15).
            그전에는 확정된 묶음에만 납부기한 **입력칸**이 있었고(실측 0건 입력),
            마감일이 지났다는 것도 어디에도 안 나왔다. */}
        {!cancelled && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              padding: "10px 0 14px",
              borderBottom: "1px solid var(--border)",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>정산 기간</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {batch.period_start} ~ {batch.period_end}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>정산 마감일</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {batch.period_end}
                {batchPeriodClosed && (
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (지남)</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>화주 결제일</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {describePaymentDue(companyPaymentDue)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>납부기한</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {batchDueDate || "미정"}
                {/* 🔴 계산값과 저장값을 **눈으로 구분할 수 있어야 한다** — 아직
                    저장되지 않은 값을 확정된 날짜처럼 보여주면 담당자가 화주에게
                    그 날짜를 말하고, 확정하지 않으면 연체 판정도 안 돈다. */}
                {batchDueIsComputed && (
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12 }}>
                    {" "}(예정)
                  </span>
                )}
              </div>
            </div>
            {confirmed && (
              <>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>세금계산서</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {batch.tax_invoice_status === "issued" ? "발행완료" : "미발행"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>입금</div>
                  {/* 🔴 컬럼만 읽지 않는다 — 납부기한이 지난 그 순간부터 연체로
                      보여야 한다(`batchOverdue` 주석 참고). */}
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: batchOverdue ? "var(--danger)" : undefined,
                    }}
                  >
                    {batch.payment_status === "paid" ? "입금완료" : batchOverdue ? "연체" : "미입금"}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 🔴 마감이 지났는데 아직 작성 중이면 알린다. **막지는 않는다** —
            늦게 등록되는 운송 건이 있어서 마감 당일에 금액이 굳지 않는다.
            (A)안의 「표시」가 이것이고, 확정은 담당자가 손으로 누른다. */}
        {draft && batchPeriodClosed && (
          <div className="error-box" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.7 }}>
            정산 마감일({batch.period_end})이 지났는데 아직 <b>작성 중</b>입니다. 담긴 건을 확인하고
            확정해주세요 — 확정하면 납부기한이{batchDueDate ? ` ${batchDueDate}로 ` : " "}채워지고, 그
            날짜가 지나면 자동으로 <b>연체</b>로 표시됩니다.
            {!batchDueDate &&
              " (이 화주는 결제일이 「협의」이거나 미설정이라 납부기한을 아래에서 직접 넣어주세요.)"}
          </div>
        )}

        {cancelled ? (
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <p style={{ margin: 0 }}>
              <b>해제된 묶음입니다.</b> 사유: {batch.cancel_reason || "-"}
            </p>
            <p style={{ margin: "4px 0 12px", color: "var(--text-muted)", fontSize: 12.5 }}>
              해제 처리자: {batch.cancelled_by_name_snapshot || "-"} · 담겼던 건은 개별 정산
              (정산대기)으로 되돌아갔습니다.
            </p>
            {isAdmin && (
              <button
                className="btn-danger"
                style={{ fontSize: 12.5, padding: "6px 10px" }}
                onClick={handleDeleteBatch}
              >
                기록 삭제
              </button>
            )}
          </div>
        ) : (
          <>
            <h4 style={{ fontSize: 13, margin: "0 0 8px" }}>담긴 정산 건 {activeItems.length}건</h4>
            {activeItems.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>아직 담긴 건이 없습니다.</p>
            ) : (
              // 🔴 감싸개의 `overflow-x` 와 표의 `min-width` 는 **한 벌이다** —
              //    감싸개만 두면 표가 줄어들며 글자가 세로로 끊기고, `min-width` 만
              //    두면 페이지 자체가 옆으로 밀려 제목·필터까지 잘려 나간다(34차 실측).
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>오더번호</th>
                      <ItemTransportHeads />
                      <th>공급가액</th>
                      <th>부가세</th>
                      <th>합계</th>
                      {draft && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeItems.map((it) => (
                      <tr key={it.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <Link href={`/admin/invoices/${it.invoice_id}`}>
                            {orderInfoByInvoiceId[it.invoice_id]?.order_no || "-"}
                          </Link>
                          {draft && needsRefreshByItemId[it.id] && (
                            <div style={{ marginTop: 4 }}>
                              <span className="badge" style={{ fontSize: 11 }}>
                                현장 추가비 등록됨
                              </span>
                            </div>
                          )}
                        </td>
                        <ItemTransportCells info={orderInfoByInvoiceId[it.invoice_id]} />
                        <td>{won(it.supply_amount_snapshot)}</td>
                        <td>{won(it.vat_amount_snapshot)}</td>
                        <td>{won(it.total_amount_snapshot)}</td>
                        {draft && (
                          <td style={{ whiteSpace: "nowrap" }}>
                            {needsRefreshByItemId[it.id] && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: 12, marginRight: 6 }}
                                onClick={() => handleRefreshItemSnapshot(it.id)}
                              >
                                새로고침
                              </button>
                            )}
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 12 }}
                              onClick={() => handleRemoveItem(it.id)}
                            >
                              제거
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>
              합계: 공급가액 {won(confirmed ? batch.supply_amount : activeSupply)} · 부가세{" "}
              {won(confirmed ? batch.vat_amount : activeVat)} · 총액{" "}
              {won(confirmed ? batch.total_amount : activeTotal)}
            </p>

            {/* 🔴 줄마다 「추가」 버튼을 두던 것을 한 줄로 합쳤다 — 자동으로 담기는
                지금 여기 남는 건은 골라 담을 이유가 없다(위 `handleAddAllCandidates`
                주석 참고). 🔴 0건이면 아예 안 그린다. */}
            {draft && availableCandidates.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 13 }}>
                  이 기간에 <b>아직 담기지 않은 정산 건 {availableCandidates.length}건</b>이 있습니다.
                </span>
                <button className="btn" style={{ fontSize: 12.5 }} onClick={handleAddAllCandidates}>
                  모두 담기
                </button>
              </div>
            )}

            {confirmed && candidates.length > 0 && (
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.7 }}>
                이 묶음이 확정된 뒤 새로 정산등록된 건이 {candidates.length}건 있습니다. 확정된
                묶음에는 담을 수 없으니, 아래 「새 묶음 만들기」에서 같은 화주·정산월로 <b>보충 묶음</b>
                을 만들어주세요.
              </p>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
              {draft && (
                <>
                  {/* 🔴 「확정 전 미리보기」 버튼을 없앴다(실사용 리뷰 1라운드) —
                      위 합계가 곧 그 미리보기 값이고, 확정 자체가 확인 창을 띄운다. */}
                  {isAdmin ? (
                    <button className="btn" onClick={handleConfirm} disabled={activeItems.length === 0}>
                      확정
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      확정은 관리자만 할 수 있습니다.
                    </span>
                  )}
                  <button
                    className="btn-danger"
                    style={{ fontSize: 12.5, padding: "6px 10px", marginLeft: 8 }}
                    onClick={handleDeleteBatch}
                  >
                    묶음 삭제
                  </button>
                </>
              )}

              {confirmed && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {batch.tax_invoice_status !== "issued" && (
                    <button className="btn" onClick={handleMarkTaxInvoiceIssued}>
                      세금계산서 발행 처리
                    </button>
                  )}
                  {batch.payment_status !== "paid" && (
                    <button className="btn" onClick={handleMarkPaymentReceived}>
                      입금완료 처리
                    </button>
                  )}
                  <div className="field" style={{ margin: 0, maxWidth: 260 }}>
                    <label style={{ fontSize: 11.5 }}>납부기한</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      {/* 🔴 `nowrap` 을 빼지 말 것 — 좁은 칸이라 「저 / 장」으로 두 줄이 된다
                          (렌더링해 보고 발견). */}
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12.5, whiteSpace: "nowrap" }}
                        onClick={handleSetDueDate}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {confirmed && (
                /* 🔴 「협의」 화주는 계산이 안 되는 것이 정상이다 — 없는 날짜를
                    지어내면 합의하지 않은 날에 연체가 붙는다. */
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                  {batch.payment_due_date
                    ? `화주 결제일 설정: ${describePaymentDue(companyPaymentDue)} · 확정 시 자동으로 채워집니다.`
                    : batchDueDate
                    ? `화주 결제일 설정(${describePaymentDue(companyPaymentDue)})으로 계산한 ${batchDueDate}을 넣어뒀습니다 — 저장을 누르면 적용됩니다.`
                    : "이 화주는 결제일이 「협의」이거나 미설정이라 자동 계산되지 않습니다. 화주와 합의한 날짜를 직접 넣어주세요."}
                </p>
              )}

              {confirmed && isAdmin && (
                <details style={{ marginTop: 14, fontSize: 12.5 }}>
                  <summary style={{ cursor: "pointer", color: "var(--text-muted)" }}>
                    묶음 해제 · 완전삭제 (관리자)
                  </summary>
                  <div style={{ marginTop: 10 }}>
                    {!showReleaseReason ? (
                      <button
                        className="btn-danger"
                        onClick={() => setShowReleaseReason(true)}
                        disabled={batch.tax_invoice_status === "issued" || batch.payment_status !== "unpaid"}
                      >
                        묶음 해제
                      </button>
                    ) : (
                      <div>
                        <div className="field" style={{ maxWidth: 400 }}>
                          <label>해제 사유 *</label>
                          <input
                            type="text"
                            value={releaseReason}
                            onChange={(e) => setReleaseReason(e.target.value)}
                            placeholder="해제 사유를 입력해주세요"
                          />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <button className="btn-danger" onClick={handleRelease} style={{ marginRight: 8 }}>
                            해제 확정
                          </button>
                          <button className="btn btn-ghost" onClick={() => setShowReleaseReason(false)}>
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                    {/* 🔴 「연체」도 해제를 막는다 — `release_billing_batch` 가
                        `payment_status in ('paid','overdue')` 를 거절한다(함수 본문
                        실측 2026-09-15 · `_verify.sql` ⑲). 이미 청구가 나간 묶음을
                        조용히 되돌리지 않겠다는 뜻이라 **의도된 동작**이다. */}
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                      세금계산서가 발행됐거나, 입금 처리가 진행됐거나, <b>연체로 표시된</b> 묶음은
                      해제할 수 없습니다 — 이미 화주에게 청구가 나간 묶음이라서입니다.
                    </p>

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                      {!showForceDeleteReason ? (
                        <button className="btn-danger" onClick={() => setShowForceDeleteReason(true)}>
                          완전삭제(테스트 정리용)
                        </button>
                      ) : (
                        <div>
                          <div className="field" style={{ maxWidth: 400 }}>
                            <label>삭제 사유 *</label>
                            <input
                              type="text"
                              value={forceDeleteReason}
                              onChange={(e) => setForceDeleteReason(e.target.value)}
                              placeholder="삭제 사유를 입력해주세요"
                            />
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <button className="btn-danger" onClick={handleForceDelete} style={{ marginRight: 8 }}>
                              완전삭제 확정
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowForceDeleteReason(false)}>
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                      <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
                        위 「묶음 해제」가 막힌 경우에도 쓸 수 있는 관리자 전용 예외 경로입니다. 담긴
                        정산 건은 개별 정산(정산대기)으로 되돌아가고, 세금계산서·입금 처리 기록은
                        사라집니다 — 되돌릴 수 없으니 테스트 데이터 정리 용도로만 사용해주세요.
                      </p>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </>
        )}
      </>
    );
  }

  /** 목록 한 줄의 상태 배지들 — 🔴 표시 시점에 다시 센다(위 주석과 같은 이유). */
  function rowBadges(b: any) {
    const overdue =
      b.batch_status === "confirmed" &&
      b.payment_status !== "paid" &&
      (b.payment_status === "overdue" || isPastDue(b.payment_due_date));
    const late = b.batch_status === "draft" && isPeriodClosed(b.period_end);
    return { overdue, late };
  }

  return (
    <div>
      {/* 🔴 맨 위 오류는 **목록·경고 줄에서 난 것만** 뜬다 — 「새 묶음 만들기」와
          묶음 상세의 오류는 각각 그 자리에서 뜬다(위 `actionError` 주석 참고). */}
      <ErrorLine scope="top" />

      {/* 🔴 자동으로 담기지 **못한** 건이 있을 때만 뜬다 — 0건이면 아무것도 그리지
          않는다. 정상 운영에서는 보이지 않는 줄이다(위 `orphans` 주석 참고). */}
      {orphans.length > 0 && (
        <div className="error-box" style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.8 }}>
          <b>아직 묶음에 담기지 않은 정산 건이 {orphans.length}건 있습니다.</b> 자동 담기가 생기기
          전에 등록된 건이거나, 그 달 묶음이 이미 확정·해제된 건입니다. <b>「담기」</b>를 누르면 그
          화주·정산월의 묶음을 찾아(없으면 만들어) 담습니다.
          {/* 🔴 **행마다 버튼을 둔다** — 글로만 「어디로 가서 무엇을 누르라」고 안내하면
              그 줄은 경고가 아니라 잔소리가 된다(실사용 리뷰 2라운드에서 실제로
              *"기존에 있던 오더는 다시 담을수 없나?"* 라는 질문이 나왔다).
              🔴 없앤 「선택」 버튼과 다르다 — 그것은 검색창 값만 바꿨고, 이것은 담는다. */}
          <div style={{ marginTop: 10 }}>
            {orphans.slice(0, 8).map((c) => (
              <div
                key={c.invoice_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  padding: "5px 0",
                  fontSize: 12.5,
                  color: "var(--text)",
                }}
              >
                <span>
                  {c.company_name} · {c.cycle_month} 정산 · {c.order_no} ·{" "}
                  {won(c.customer_charge_total)}
                </span>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: "4px 12px", whiteSpace: "nowrap" }}
                  onClick={() => handleAttachOrphan(c)}
                >
                  담기
                </button>
              </div>
            ))}
            {orphans.length > 8 && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                · 외 {orphans.length - 8}건 (담으면 나머지가 이어서 표시됩니다)
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginTop: 0, marginBottom: 4 }}>월정산 묶음 {recentBatches.length}건</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 14 }}>
          운송이 완료되면 월정산 건은 그 화주·정산월의 묶음에 <b>자동으로 담깁니다</b>. 줄을 눌러
          펼치면 담긴 건과 정산 일정을 보고 확정·세금계산서·입금을 처리할 수 있습니다.
        </p>

        {recentBatches.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>아직 만들어진 묶음이 없습니다.</p>
        ) : (
          <div>
            {recentBatches.map((b: any) => {
              const open = batch?.id === b.id;
              const { overdue, late } = rowBadges(b);
              return (
                <div
                  key={b.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    marginBottom: 8,
                    overflow: "hidden",
                  }}
                >
                  {/* 🔴 줄 전체가 펼침 버튼이다 — 그전에는 **회사명만** 눌러야 했고
                      무엇을 눌러야 하는지 보이지 않았다. */}
                  <button
                    onClick={() => toggleBatch(b)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      padding: "11px 14px",
                      background: open ? "var(--bg-subtle, #fafafa)" : "transparent",
                      border: "none",
                      borderBottom: open ? "1px solid var(--border)" : "none",
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                    }}
                    aria-expanded={open}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)", width: 12 }}>
                      {open ? "▾" : "▸"}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 120 }}>
                      {b.companies?.name || "-"}
                    </span>
                    <span style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {String(b.period_end).slice(0, 7)} 정산
                    </span>
                    <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {b.batch_status === "draft"
                        ? "작성중"
                        : b.batch_status === "confirmed"
                        ? "확정"
                        : "해제됨"}
                    </span>
                    {late && (
                      <span style={{ fontSize: 11.5, color: "var(--danger)", whiteSpace: "nowrap" }}>
                        마감 지남
                      </span>
                    )}
                    {b.batch_status === "confirmed" && (
                      <span
                        style={{
                          fontSize: 11.5,
                          whiteSpace: "nowrap",
                          color: overdue ? "var(--danger)" : "var(--text-muted)",
                        }}
                      >
                        {b.payment_status === "paid"
                          ? "입금완료"
                          : overdue
                          ? "연체"
                          : b.tax_invoice_status === "issued"
                          ? "발행완료 · 입금대기"
                          : "세금계산서 미발행"}
                      </span>
                    )}
                    {/* 🔴 **펼치기 전에도 읽히도록** 건수·공급가액·부가세 포함가·납부기한을
                        오른쪽에 두 줄로 모았다(사용자 지시 2026-09-15). 굵은 줄은 **청구할
                        금액(부가세 포함)**이고, 아래 회색 줄이 내역이다.
                        🔴 **줄을 더 늘리지 말 것** — 목록이 복잡해지면 여기 둔 의미가 없다.
                        🔴 확정된 묶음의 금액은 **얼려진 값**(`supply_amount`/`total_amount`)이고
                        작성 중은 담긴 항목의 합이다. 섞지 말 것. */}
                    {(() => {
                      const a = aggByBatchId[b.id];
                      const cancelled = b.batch_status === "cancelled";
                      const draft = b.batch_status === "draft";
                      const supply = draft ? a?.supply ?? 0 : b.supply_amount ?? null;
                      const total = draft ? a?.total ?? 0 : b.total_amount ?? null;
                      const count = a?.count ?? 0;
                      const empty = cancelled || (draft && count === 0);
                      return (
                        <span
                          style={{
                            marginLeft: "auto",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            lineHeight: 1.45,
                          }}
                        >
                          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
                            {empty ? (
                              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                                {cancelled ? "해제됨" : "담긴 건 없음"}
                              </span>
                            ) : (
                              <>
                                {won(total)}
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 400,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {" "}
                                  부가세 포함
                                </span>
                              </>
                            )}
                          </span>
                          {!empty && (
                            <span
                              style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}
                            >
                              {count}건 · 공급가 {won(supply)}
                              {b.payment_due_date ? ` · 기한 ${b.payment_due_date}` : ""}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </button>

                  {open && (
                    <div style={{ padding: "14px 14px 16px" }}>
                      {loading ? (
                        <div className="empty-state">불러오는 중...</div>
                      ) : (
                        <BatchDetail />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔴 「새 묶음 만들기」는 접어 뒀다 — 자동 생성이 도는 지금은 **평소에 쓸 일이
          없는 길**이고(보충 묶음 · 자동 처리가 실패한 달), 펼쳐 두면 화면의 첫인상이
          검색창이 된다. 🔴 없애지는 말 것 — 확정된 달에 늦게 들어온 건을 담을
          유일한 경로다. */}
      <details className="card" style={{ padding: 20 }}>
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          새 묶음 만들기 (보충 묶음 · 자동으로 만들어지지 않은 달)
        </summary>

        <div className="form-grid" style={{ padding: 0, marginTop: 14, marginBottom: 6, maxWidth: 480 }}>
          <div className="field">
            <label>화주 검색</label>
            <input
              value={selectedCompany ? selectedCompany.name : companySearch}
              onChange={(e) => {
                setSelectedCompany(null);
                setCompanyId("");
                setCompanySearch(e.target.value);
              }}
              placeholder="회사명을 입력해서 검색"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>정산월</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>

        {!selectedCompany && companyResults.length > 0 && (
          <div className="card" style={{ maxWidth: 220, marginBottom: 12, maxHeight: 180, overflowY: "auto" }}>
            {companyResults.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCompany(c);
                  setCompanyId(c.id);
                  setCompanyResults([]);
                  // 🔴 **정산월을 그 화주의 「담기지 않은 건」이 있는 달로 맞춘다.**
                  //    기본값이 이번 달이라, 담을 건이 지난달 것이면 「담을 수 있는
                  //    정산 건 0건」이 뜨고 버튼이 비활성이 된다 — 담당자에게는
                  //    「새 묶음 만들기가 안된다」로 보인다(실사용 리뷰 3라운드).
                  //    🔴 달을 직접 고르는 것은 그대로 되므로 길을 막지 않는다.
                  const mine = orphans.find(
                    (o) => o.company_id === c.id && o.cycle_month && o.cycle_month !== "-"
                  );
                  if (mine) setMonth(mine.cycle_month);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {c.name}
              </div>
            ))}
          </div>
        )}

        <ErrorLine scope="create" />

        {/* 🔴 **아무것도 안 그리는 분기를 만들지 말 것.** 그전에는
            `selectedCompany && createTarget` 이라, 거래조건 조회가 실패하면
            `createTarget` 이 `null` 로 남아 **버튼이 아예 렌더링되지 않았다** —
            담당자에게는 「새 묶음 만들기가 안된다」로 보인다(실사용 리뷰 3라운드). */}
        {selectedCompany && !createTarget && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
            {createLoading
              ? "이 화주·정산월의 상태를 확인하는 중입니다..."
              : "이 화주·정산월의 상태를 확인하지 못했습니다. 위 오류를 확인하거나 화주를 다시 선택해주세요."}
          </p>
        )}

        {selectedCompany && createTarget && (
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 8px", color: "var(--text-muted)" }}>
              실제 정산 기간: {createTarget.period.period_start} ~ {createTarget.period.period_end}
              {createTarget.cutoffDay
                ? ` (이 화주는 매달 ${createTarget.cutoffDay}일 마감)`
                : " (정산 마감일 미설정 — 달력월 기준)"}
            </p>
            {createTarget.existing && createTarget.existing.batch_status !== "cancelled" ? (
              <p style={{ margin: "0 0 10px" }}>
                이 화주·정산월에는 이미{" "}
                <b>{createTarget.existing.batch_status === "draft" ? "작성 중" : "확정된"}</b> 묶음이
                있습니다 — 위 목록에서 펼쳐 확인해주세요.
                {createTarget.existing.batch_status === "confirmed" && createTarget.candidateCount > 0 && (
                  <>
                    {" "}확정 이후 새로 등록된 {createTarget.candidateCount}건은 <b>보충 묶음</b>으로
                    담을 수 있습니다.
                  </>
                )}
              </p>
            ) : (
              <p style={{ margin: "0 0 10px" }}>
                담을 수 있는 정산 건 {createTarget.candidateCount}건을 확인했습니다.
              </p>
            )}
            <button
              className="btn"
              onClick={handleCreateBatch}
              disabled={
                createTarget.candidateCount === 0 ||
                (!!createTarget.existing && createTarget.existing.batch_status === "draft")
              }
            >
              {createTarget.existing && createTarget.existing.batch_status === "confirmed"
                ? "보충 묶음 만들기"
                : "묶음 만들기"}
            </button>
            {/* 🔴 **비활성인 이유와 「그럼 어디로 가야 하는지」를 같이 말한다.**
                버튼이 회색이기만 하면 담당자는 고장으로 읽는다. */}
            {createTarget.candidateCount === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.7 }}>
                {createTarget.period.period_start} ~ {createTarget.period.period_end} 기간에 담을 수
                있는 정산 건(주선사 정산·월정산, 정산대기 상태)이 없습니다.
                {(() => {
                  const mine = orphans.filter((o) => o.company_id === companyId);
                  if (mine.length === 0) return null;
                  const months = Array.from(new Set(mine.map((o) => o.cycle_month))).join(", ");
                  return ` 이 화주는 ${months} 정산월에 담기지 않은 건이 ${mine.length}건 있습니다 — 정산월을 그 달로 바꾸거나, 맨 위 「담기」를 누르면 바로 담깁니다.`;
                })()}
              </p>
            )}
            {!!createTarget.existing && createTarget.existing.batch_status === "draft" && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.7 }}>
                이미 작성 중인 묶음이 있어 새로 만들 수 없습니다 — 위 목록에서 그 묶음을 펼쳐
                「모두 담기」로 담아주세요. (한 화주·기간에 작성 중 묶음은 하나만 둡니다.)
              </p>
            )}
          </div>
        )}

        <details style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-muted)" }}>
          <summary style={{ cursor: "pointer" }}>묶음에 담기는 조건 · 마감 이후 흐름</summary>
          <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>정산방식이 "주선사 정산 · 월정산"(수금방식 broker, 청구주기 monthly)인 건</li>
            <li>정산 상태가 "정산대기"인 건(이미 청구·입금 처리가 시작된 건은 제외)</li>
            <li>화주 청구금액이 확정되어 있고(0원·미입력 아님), 아직 다른 묶음에 포함되지 않은 건</li>
          </ul>
          <p style={{ marginTop: 10, lineHeight: 1.7 }}>
            이 조건에 맞는 건은 <b>운송완료 시점에 자동으로 담깁니다.</b> 다만 그 달 묶음이 이미{" "}
            <b>확정</b>되었거나 <b>해제</b>된 상태면 자동으로 담지 않습니다 — 확정된 금액이 담당자도
            모르게 흔들리거나, 일부러 해제한 묶음이 되살아나면 안 되기 때문입니다.
          </p>
          <p style={{ marginTop: 8, lineHeight: 1.7 }}>
            <b>마감일(월말)이 지나면</b> 작성 중인 묶음에 「마감 지남」 표시가 붙습니다. 확정은
            담당자가 직접 누릅니다 — 마감 직후에 뒤늦게 등록되는 운송 건이 있어서 자동으로 굳히지
            않습니다. 확정하면 화주 결제일 설정으로 <b>납부기한</b>이 채워지고, 그 날짜가 지나도록
            입금이 없으면 매일 도는 작업이 <b>연체</b>로 표시합니다.
          </p>
        </details>
      </details>
    </div>
  );
}

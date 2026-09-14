"use client";

import { useEffect, useMemo, useState } from "react";
// 🔴 원칙 31번 — 앱 내부 경로는 반드시 next/link. <a href> 로 바꾸면 하드 리로드가 된다.
import Link from "next/link";
import { calcMargin } from "@/lib/marginCalc";
// 🔴 부가세 포함가 병기용 — 공용 함수만 쓴다(`× 1.1` 을 화면에 직접 적지 말 것).
import { calcInclusiveAmount } from "@/lib/vat";
// 🔴 원칙 8번 — 엑셀은 공용 함수만 쓴다(헤더 굵게+옐로 배경 · 1행 틀고정이 자동).
//    `xlsx` 가 아니라 `xlsx-js-style` 을 쓰는 것도 그 파일 안에서 처리된다.
import { exportMultiSheetExcel, buildExportFilename } from "@/lib/exportExcel";
import { CLAIM_TYPES, getClaimTypeLabel } from "@/lib/claims";
import { DISPATCH_EXTRA_CHARGE_CATEGORIES, getDispatchExtraChargeCategoryLabel } from "@/lib/dispatchExtraCharges";

type InvoiceRow = {
  id: string;
  order_id: string | null;
  company_id: string | null;
  individual_customer_id: string | null;
  billing_period: string | null;
  customer_charge_total: number | null;
  driver_payout_total: number | null;
  status: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_no: string;
  company_id: string | null;
  individual_customer_id: string | null;
  guest_name: string | null;
  created_by: string | null;
  created_at: string;
};

type ClaimRow = {
  claim_type: string;
  status: string;
  claim_amount: number | null;
  compensation_amount: number | null;
  created_at: string;
};

type ExtraChargeStat = { count: number; customerAmount: number; driverAmount: number };

type DashboardApiResponse = {
  invoices: InvoiceRow[];
  orders: OrderRow[];
  claims: ClaimRow[];
  companies: { id: string; name: string }[];
  individualCustomers: { id: string; name: string }[];
  staffAccounts: { id: string; name: string }[];
  extraChargeAttributionByInvoiceId: Record<string, ExtraChargeStat>;
  extraChargeByCategory: Record<string, ExtraChargeStat>;
  // 🔴 `null` 은 「0개」가 아니라 「조회 실패」다 — 빈 배열로 갈음하지 말 것(33차 B장).
  // 🔴 개수는 이 배열의 길이다 — 개수를 따로 받지 말 것(두 값이 조용히 어긋난다).
  recurringContractCompanies:
    | { id: string; name: string; endedOn: string | null }[]
    | null;
  recurringContractError: string | null;
};

function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

/** 막대 위에 얹는 짧은 표기 — 자리가 좁아 원 단위를 다 쓰면 서로 겹친다. */
function manwon(n: number) {
  if (n === 0) return "—";
  return `${Math.round(n / 10000).toLocaleString("ko-KR")}만`;
}

// ── 부가세 포함가 병기 (35차 리뷰 7라운드 · 사용자 지시) ──────────────────────
//
// 🔴 **부가세 포함가는 「더 버는 돈」이 아니다.** 이 화면의 마진은 공급가액이고,
//    거기 붙는 10% 는 받아서 국가에 내는 돈이다. 세금계산서 금액·통장에 찍히는
//    입금액과 맞춰 볼 때 쓰라고 병기하는 것이지 수익으로 읽으면 안 된다.
//    🔴 그래서 **항상 괄호 + 흐린 보조 글씨**다 — 마진과 같은 크기·굵기로 올리면
//       둘 중 어느 것이 실적인지 화면이 스스로 말하지 못하게 된다.
//
// 🔴 마진이 공급가액이라 포함가는 정확히 ×1.1 이다(주선사정산은 청구·지급 양쪽이
//    같은 비율로 커지고, 선착불은 원래 포함가로 입력된 주선수수료로 되돌아간다).
function wonVat(n: number) {
  return `부가세 포함 ${won(calcInclusiveAmount(n))}`;
}

function manwonVat(n: number) {
  if (n === 0) return "";
  return `(${manwon(calcInclusiveAmount(n))})`;
}

function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const abs = y * 12 + (m - 1) + delta;
  return `${Math.floor(abs / 12)}-${String((abs % 12) + 1).padStart(2, "0")}`;
}

function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  let cur = from;
  // 넉넉한 상한 — 무한 루프 방지
  for (let i = 0; i < 240 && cur <= to; i += 1) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

function shortMonth(month: string, showYear: boolean) {
  const [y, m] = month.split("-");
  return `${showYear ? `'${y.slice(2)} ` : ""}${Number(m)}월`;
}

// 🔴 위 넷은 화주포털 월별통계(`app/customer/stats/page.tsx`)에 같은 이름으로 있는
//    것과 **같은 계산이지만 일부러 각자 둔다.** 공용 파일로 빼면 이 차수가
//    화주포털 파일을 건드리게 되고, 포털 쪽은 시행일·데이터 하한 같은 자기 사정이
//    얽혀 있어 한쪽을 고치면 다른 쪽이 조용히 따라 바뀐다.
//    ⚠️ 그래서 **둘 중 하나를 고칠 때 다른 쪽을 따라 고치지 않아도 된다** — 의도된 분리다.

const PERIOD_PRESETS = [
  { key: "m3", label: "최근 3개월", months: 3 },
  { key: "m6", label: "최근 6개월", months: 6 },
  { key: "m12", label: "최근 12개월", months: 12 },
  { key: "m24", label: "최근 24개월", months: 24 },
  { key: "all", label: "전체", months: null },
] as const;

// 🔴 `custom` 은 칩이 아니라 **월 선택기를 직접 손댄 상태**다 — 칩을 하나도 켜지
//    않기 위해 따로 둔다. 이것 없이 아무 칩 키나 쓰면 「최근 12개월」이 켜진 채로
//    구간은 다른 모순이 남는다.
type PeriodKey = (typeof PERIOD_PRESETS)[number]["key"] | "custom";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 정기계약 명단 펼침(33차 B장 리뷰) — 기본은 접힘. 개수만 보고 지나가는 것이
  // 이 카드의 원래 쓰임이고, 명단은 "누구인지" 궁금할 때만 편다.
  const [recurringOpen, setRecurringOpen] = useState(false);

  // 🔴 조회기간(35차 리뷰 5라운드) — 그전에는 **최근 12개월 고정**이었다.
  //    프리셋이 서버 창(`months`)을 정하고, 아래 `fromMonth`~`toMonth` 가 화면에
  //    그릴 구간을 정한다. 둘을 하나로 합치지 말 것 — 서버 창은 「어디까지
  //    읽어올지」이고 구간은 「무엇을 보여줄지」라서, 창을 구간에 딱 맞추면
  //    경계 달의 정산 건이 잘려 그래프가 비어 보인다(정산월 ≠ 생성일).
  const [period, setPeriod] = useState<PeriodKey>("m12");
  const thisMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [fromMonth, setFromMonth] = useState(() =>
    addMonths(new Date().toISOString().slice(0, 7), -11)
  );
  const [toMonth, setToMonth] = useState(thisMonth);

  function applyPreset(key: Exclude<PeriodKey, "custom">) {
    setPeriod(key);
    const preset = PERIOD_PRESETS.find((p) => p.key === key);
    setToMonth(thisMonth);
    if (!preset || preset.months == null) {
      // 「전체」 — 아래 `dataMinMonth` 가 실제 데이터 하한으로 다시 맞춘다.
      setFromMonth(addMonths(thisMonth, -119));
      return;
    }
    setFromMonth(addMonths(thisMonth, -(preset.months - 1)));
  }

  /**
   * 🔴 서버 창은 **고른 구간에서 뽑는다** — 프리셋 키에서 뽑으면 안 된다.
   *    월 선택기로 직접 더 오래된 달을 고른 순간 창은 그대로라 데이터가 빈다.
   * 🔴 `+2` 는 창을 구간보다 두 달 넉넉히 잡는 것이다 — 정산월과 생성일이 같은 달이
   *    아니라서, 창을 구간에 딱 맞추면 경계 달의 정산 건이 잘린다. 빼지 말 것.
   */
  const fetchMonths = useMemo(() => {
    if (period === "all") return "all";
    const span = monthsBetween(fromMonth > toMonth ? toMonth : fromMonth, thisMonth).length;
    return String(Math.max(3, span + 2));
  }, [period, fromMonth, toMonth, thisMonth]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/dashboard-stats?months=${fetchMonths}`, {
        // 🔴 원칙 21번 — 서버 라우트가 `createServiceClient()` 를 쓰더라도 호출 쪽에서
        //    캐시를 끈다. 안 끄면 기간을 바꿔도 옛 응답이 그대로 돌아온다.
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "대시보드 데이터를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }
      setError(null);
      setData(json);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchMonths]);

  // 🔴 35차 C-1 — 마진 정의를 `lib/marginCalc.ts` 하나로 옮겼다(사용자 확정 2026-09-11).
  //
  //    「위캐리가 버는 돈, 부가세 제외」 하나이고, 수금방식이 계산식을 정한다:
  //      주선사정산  마진 = 화주청구(공급가액) − 차주지급(공급가액)
  //      선착불      마진 = 주선수수료 ÷ 1.1   🔴 운임은 매출에도 원가에도 안 잡는다
  //
  //    ⚠️ 그전에는 수금방식과 무관하게 `화주청구 × 1.1 − 차주지급` 이었다 —
  //       선착불에서 **위캐리를 거치지도 않는 운임**을 매출로 세고 있었다.
  //    🔴 다른 두 마진(DB 생성 컬럼 `dispatches.margin` · `settlementCalc` 의 실질마진)을
  //       이 화면에 섞지 말 것(하지말것 5). 실질마진은 `driver_base_fare` 입력이 실측
  //       0건이라 켜면 숫자가 틀린다.
  const marginOf = (inv: any, extraCharge: number, extraPayout: number) =>
    calcMargin({
      collectionMethod: inv.collection_method,
      customerCharge: (inv.customer_charge_total || 0) + extraCharge,
      customerChargeVatIncluded: inv.customer_charge_vat_included,
      driverPayout: (inv.driver_payout_total || 0) + extraPayout,
      driverVatIncluded: inv.driver_vat_included,
      brokerageFee: inv.brokerage_fee,
    });

  /** 실제 데이터가 있는 가장 오래된 정산월 — 「전체」의 하한이다. */
  const dataMinMonth = useMemo(() => {
    let min: string | null = null;
    (data?.invoices || []).forEach((i) => {
      if (!i.billing_period) return;
      if (!min || i.billing_period < min) min = i.billing_period;
    });
    return min || thisMonth;
  }, [data, thisMonth]);

  /**
   * 🔴 표시 구간 — 화주포털 월별통계가 겪은 함정을 그대로 피한다(60차 ⑨).
   *      ① 끝월은 이번 달을 넘지 않는다(미래 달을 그리지 않는다)
   *      ② 시작월은 하한으로 누르지 않는다(눌렀더니 프리셋 넷이 전부 「이번 달 ~
   *         이번 달」로 붕괴해 화면이 통째로 비었다)
   *      ③ 시작월 > 끝월 이면 끝월로 맞춘다 — 구간이 거꾸로 잡히는 것만 막는다
   *    🔴 셋 다 지우지 말 것.
   */
  const effTo = toMonth > thisMonth ? thisMonth : toMonth;
  const rawFrom = period === "all" ? dataMinMonth : fromMonth;
  const effFrom = rawFrom > effTo ? effTo : rawFrom;

  /**
   * 🔴 구간으로 자른 원본 — 아래 집계는 전부 이것만 본다.
   *    ⚠️ **정산은 정산월(`billing_period`), 오더·클레임은 등록월(`created_at`)** 로
   *       자른다. 두 표에 공통 기준이 없어서이고, 화면 설명에 그 사실을 적었다.
   *       🔴 오더를 정산월로 자르려 하지 말 것 — 오더에는 정산월이 없다.
   */
  const scoped = useMemo(() => {
    if (!data) return { invoices: [], orders: [], claims: [] };
    const inRange = (m: string | null | undefined) => !!m && m >= effFrom && m <= effTo;
    return {
      invoices: data.invoices.filter((i) => inRange(i.billing_period)),
      orders: data.orders.filter((o) => inRange((o.created_at || "").slice(0, 7))),
      claims: data.claims.filter((c) => inRange((c.created_at || "").slice(0, 7))),
    };
  }, [data, effFrom, effTo]);

  // 오더별 취급고·원가·마진(현장 추가비 표시시점 합산 포함) — 담당자별/화주별 섹션이
  // 공통으로 재사용하는 중간 집계.
  // 🔴 `revenue` 는 **매출이 아니라 취급고**다 — 선착불 운임이 섞이므로 화면에
  //    「매출」이라고 적지 말 것.
  const revenueByOrderId = useMemo(() => {
    const map: Record<string, { revenue: number; cost: number; margin: number }> = {};
    if (!data) return map;
    scoped.invoices.forEach((inv) => {
      if (!inv.order_id) return;
      const attribution = data.extraChargeAttributionByInvoiceId[inv.id];
      const extraCharge = attribution?.customerAmount || 0;
      const extraPayout = attribution?.driverAmount || 0;
      const revenue = (inv.customer_charge_total || 0) + extraCharge;
      const cost = (inv.driver_payout_total || 0) + extraPayout;
      const margin = marginOf(inv, extraCharge, extraPayout);
      const cur = map[inv.order_id] || { revenue: 0, cost: 0, margin: 0 };
      cur.revenue += revenue;
      cur.cost += cost;
      cur.margin += margin;
      map[inv.order_id] = cur;
    });
    return map;
  }, [data, scoped]);

  // A. 전사 월별 마진 추이 (billing_period 기준)
  // 🔴 **실적이 없는 달도 0 으로 채운다**(35차 리뷰 5라운드) — 추이를 보는 그래프라
  //    빈 달이 빠지면 가로축이 압축되어 「쉬어 간 달」이 없었던 것처럼 보인다.
  //    ⚠️ 그전에는 실적이 있는 달만 나열했다.
  // 🔴 `billing_period` 가 빈 정산 건은 이제 빠진다(구간 필터가 값을 요구한다).
  //    그전에는 「미지정」이라는 가짜 달로 묶여 그래프 끝에 붙어 있었다 — 추이에
  //    끼우면 축이 망가지므로 뺀 것이고, 그런 건은 정산 목록에서 봐야 한다.
  const monthlyRows = useMemo(() => {
    if (!data) return [];
    const map: Record<string, { period: string; revenue: number; margin: number; count: number }> = {};
    monthsBetween(effFrom, effTo).forEach((m) => {
      map[m] = { period: m, revenue: 0, margin: 0, count: 0 };
    });
    scoped.invoices.forEach((inv) => {
      const key = inv.billing_period as string;
      if (!map[key]) return;
      const attribution = data.extraChargeAttributionByInvoiceId[inv.id];
      const extraCharge = attribution?.customerAmount || 0;
      const extraPayout = attribution?.driverAmount || 0;
      map[key].revenue += (inv.customer_charge_total || 0) + extraCharge;
      map[key].margin += marginOf(inv, extraCharge, extraPayout);
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  }, [data, scoped, effFrom, effTo]);

  // B. 담당자별 영업 성과 (orders.created_by 기준 — 오더 처리 담당자 기준)
  const staffRows = useMemo(() => {
    if (!data) return [];
    const staffNameById: Record<string, string> = {};
    data.staffAccounts.forEach((s) => {
      staffNameById[s.id] = s.name;
    });
    const map: Record<string, { key: string; name: string; orderCount: number; revenue: number; margin: number }> =
      {};
    scoped.orders.forEach((o) => {
      const key = o.created_by || "__unassigned__";
      const name = o.created_by ? staffNameById[o.created_by] || "알 수 없음(탈퇴 계정)" : "담당자 미배정";
      const cur = map[key] || { key, name, orderCount: 0, revenue: 0, margin: 0 };
      cur.orderCount += 1;
      const rev = revenueByOrderId[o.id];
      if (rev) {
        cur.revenue += rev.revenue;
        cur.margin += rev.margin;
      }
      map[key] = cur;
    });
    return Object.values(map).sort((a, b) => b.margin - a.margin);
  }, [data, scoped, revenueByOrderId]);

  // C. 화주별 수익성 순위 (company/개인고객/게스트 순으로 식별, TOP 10)
  const customerRows = useMemo(() => {
    if (!data) return [];
    const companyNameById: Record<string, string> = {};
    data.companies.forEach((c) => {
      companyNameById[c.id] = c.name;
    });
    const individualNameById: Record<string, string> = {};
    data.individualCustomers.forEach((c) => {
      individualNameById[c.id] = c.name;
    });

    function keyOf(o: OrderRow) {
      if (o.company_id) return `company:${o.company_id}`;
      if (o.individual_customer_id) return `individual:${o.individual_customer_id}`;
      return `guest:${o.guest_name || "이름 미상"}`;
    }
    function nameOf(o: OrderRow) {
      if (o.company_id) return companyNameById[o.company_id] || "(알 수 없는 화주)";
      if (o.individual_customer_id) return individualNameById[o.individual_customer_id] || "(개인고객)";
      return o.guest_name || "게스트(이름 미상)";
    }

    const map: Record<string, { key: string; name: string; orderCount: number; revenue: number; margin: number }> =
      {};
    scoped.orders.forEach((o) => {
      const key = keyOf(o);
      const name = nameOf(o);
      const cur = map[key] || { key, name, orderCount: 0, revenue: 0, margin: 0 };
      cur.orderCount += 1;
      const rev = revenueByOrderId[o.id];
      if (rev) {
        cur.revenue += rev.revenue;
        cur.margin += rev.margin;
      }
      map[key] = cur;
    });
    return Object.values(map)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  }, [data, scoped, revenueByOrderId]);

  // D. 클레임·현장추가비 통계
  const claimStats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    let totalCount = 0;
    let compensationTotal = 0;
    let compensationCount = 0;
    let claimAmountRefTotal = 0;
    if (data) {
      scoped.claims.forEach((c) => {
        totalCount += 1;
        typeCounts[c.claim_type] = (typeCounts[c.claim_type] || 0) + 1;
        if (c.status === "처리완료" && c.compensation_amount != null) {
          compensationTotal += c.compensation_amount;
          compensationCount += 1;
        }
        if (c.claim_amount != null) claimAmountRefTotal += c.claim_amount;
      });
    }
    return { typeCounts, totalCount, compensationTotal, compensationCount, claimAmountRefTotal };
  }, [data, scoped]);

  const extraChargeCategoryRows = useMemo(() => {
    return DISPATCH_EXTRA_CHARGE_CATEGORIES.map((cat) => ({
      category: cat,
      label: getDispatchExtraChargeCategoryLabel(cat),
      ...(data?.extraChargeByCategory[cat] || { count: 0, customerAmount: 0, driverAmount: 0 }),
    }));
  }, [data]);

  // 🔴 `null`(조회 실패)과 `[]`(0개)를 구분해서 넘긴다 — 합치면 실패가 0개로 읽힌다.
  const recurringList = data?.recurringContractCompanies ?? null;

  // 🔴 35차 C-2 (사용자 13번) — **마진 금액이 주인공**이다. 막대 길이의 기준도
  //    취급고가 아니라 마진으로 바꿨다(그전에는 매출 기준이라, 마진이 작은 큰 건이
  //    가장 길게 그려져 「어느 달이 잘 벌었나」를 읽을 수 없었다).
  const maxMonthlyMargin = Math.max(1, ...monthlyRows.map((r) => Math.abs(r.margin)));
  const totalMargin = monthlyRows.reduce((sum, r) => sum + r.margin, 0);
  const totalVolume = monthlyRows.reduce((sum, r) => sum + r.revenue, 0);
  const totalCount = monthlyRows.reduce((sum, r) => sum + r.count, 0);
  // 🔴 평균선은 **실적이 있는 달**로 나눈다 — 빈 달까지 나누면 「쉬어 간 달」이
  //    평균을 끌어내려, 실제로 일한 달이 전부 평균 위로 올라간다.
  const activeMonthCount = monthlyRows.filter((r) => r.count > 0).length;
  const avgMonthlyMargin = activeMonthCount > 0 ? totalMargin / activeMonthCount : 0;
  // 가로축에 연도를 적을지 — 해가 바뀌는 구간에서만 적는다(12개월 이하면 군더더기다)
  const showYear =
    monthlyRows.length > 0 &&
    monthlyRows[0].period.slice(0, 4) !== monthlyRows[monthlyRows.length - 1].period.slice(0, 4);
  const periodLabel = `${effFrom.replace("-", ".")} ~ ${effTo.replace("-", ".")}`;

  /**
   * 엑셀 내려받기(35차 리뷰 6라운드 · 사용자 지시 *"운영 대시보드 데이터를 엑셀로도
   * 다운받을 수 있게 설정하자"*).
   *
   * 🔴 **화면에 보이는 그대로를 넣는다** — 지금 고른 조회기간의 네 섹션이 시트 넷이다.
   *    화면은 마진 기준으로 정렬·표시하는데 엑셀만 다른 값을 담으면 두 숫자가 갈린다.
   * 🔴 **마진은 `lib/marginCalc.ts` 를 거친 값 그대로다** — 여기서 다시 계산하지 말 것.
   * 🔴 관리자 전용 화면이라 차주 지급액이 섞인 「취급고」를 넣어도 된다. ⚠️ 다만 이
   *    파일을 화주에게 그대로 보내면 안 된다 — 화주에게 보낼 것은 화주포털의
   *    월별통계 엑셀이다.
   */
  function handleExportExcel() {
    const filename = buildExportFilename("", "운영대시보드", periodLabel.replace(/ /g, ""));
    exportMultiSheetExcel(filename, [
      {
        name: "월별 마진",
        rows:
          monthlyRows.length > 0
            ? monthlyRows.map((r, idx) => {
                const prev = idx > 0 ? monthlyRows[idx - 1] : null;
                const changePct =
                  prev && prev.margin > 0
                    ? Math.round(((r.margin - prev.margin) / prev.margin) * 100)
                    : null;
                return {
                  정산월: r.period,
                  "마진(부가세 제외)": Math.round(r.margin),
                  // 🔴 화면과 같은 것을 낸다(리뷰 7라운드) — 파일에만 없으면
                  //    받은 사람이 세금계산서 금액과 맞춰 볼 수가 없다.
                  "마진(부가세 포함)": calcInclusiveAmount(Math.round(r.margin)),
                  "취급고(참고)": Math.round(r.revenue),
                  정산건수: r.count,
                  "전월 대비(%)": changePct === null ? "" : changePct,
                };
              })
            : [{ 안내: "해당 기간 정산 데이터 없음" }],
      },
      {
        name: "화주별 수익성",
        rows:
          customerRows.length > 0
            ? customerRows.map((r, idx) => ({
                순위: idx + 1,
                화주: r.name,
                오더건수: r.orderCount,
                "마진(부가세 제외)": Math.round(r.margin),
                "마진(부가세 포함)": calcInclusiveAmount(Math.round(r.margin)),
                "취급고(참고)": Math.round(r.revenue),
              }))
            : [{ 안내: "해당 기간 오더 없음" }],
      },
      {
        name: "담당자별",
        rows:
          staffRows.length > 0
            ? staffRows.map((r) => ({
                담당자: r.name,
                오더건수: r.orderCount,
                "마진(부가세 제외)": Math.round(r.margin),
                "마진(부가세 포함)": calcInclusiveAmount(Math.round(r.margin)),
                "취급고(참고)": Math.round(r.revenue),
              }))
            : [{ 안내: "해당 기간 오더 없음" }],
      },
      {
        name: "클레임·추가비",
        rows: [
          ...CLAIM_TYPES.map((t) => ({
            구분: "클레임",
            항목: getClaimTypeLabel(t),
            건수: claimStats.typeCounts[t] || 0,
            "화주 청구액": "",
            "차주 지급액": "",
          })),
          {
            구분: "클레임",
            항목: "배상 완료 합계",
            건수: claimStats.compensationCount,
            "화주 청구액": Math.round(claimStats.compensationTotal),
            "차주 지급액": "",
          },
          ...extraChargeCategoryRows.map((r) => ({
            구분: "현장 추가비",
            항목: r.label,
            건수: r.count,
            "화주 청구액": Math.round(r.customerAmount),
            "차주 지급액": Math.round(r.driverAmount),
          })),
        ],
      },
    ]);
  }
  // 🔴 35차 C-2 — 정렬·막대 기준을 취급고에서 **마진**으로 바꿨다(사용자 13번)
  const maxStaffMargin = Math.max(1, ...staffRows.map((r) => Math.abs(r.margin)));
  const maxCustomerMargin = Math.max(1, ...customerRows.map((r) => Math.abs(r.margin)));

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운영 대시보드</h1>
          <p className="page-desc">
            관리자 전용 · 조회기간 <strong>{periodLabel}</strong>. 정산은 <strong>정산월</strong>,
            오더·클레임은 <strong>등록월</strong> 기준으로 자릅니다(두 표에 공통 기준이 없습니다).
          </p>
        </div>
      </div>

      {/* ── 조회기간 (35차 리뷰 5라운드 · 사용자 지시) ──────────────────────────────
          🔴 그전에는 **최근 12개월 고정**이었고 기간을 고를 방법이 없었다.
          🔴 포털 월별통계의 `Pv2DatePicker`·`Pv2Select` 를 가져오지 않았다 —
             `--pv2-*` 토큰이 `.portal-v2` 스코프 안에만 있어서 관리자에서는 색이
             안 나온다(PR #145 에서 실측). 관리자는 네이티브 `select` 가 정상이다
             (원칙 57번은 **포털 한정**이다). */}
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: period === p.key ? 700 : 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
                border: "1px solid var(--border)",
                background: period === p.key ? "var(--brand-yellow)" : "transparent",
                color: period === p.key ? "#1a1a1a" : "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* 🔴 프리셋을 고른 뒤 직접 손보면 프리셋 표시는 풀어야 한다 — 안 풀면
            칩은 「최근 6개월」인데 구간은 다른 모순이 남는다. 「전체」로 돌아갈 수
            있게 프리셋 자체를 지우지는 않고 `m12` 로 두지도 않는다. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <input
            type="month"
            value={effFrom}
            max={effTo}
            onChange={(e) => {
              if (!e.target.value) return;
              setPeriod("custom");
              setFromMonth(e.target.value);
            }}
            style={{ fontSize: 12.5, padding: "5px 8px" }}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>~</span>
          <input
            type="month"
            value={effTo}
            max={thisMonth}
            onChange={(e) => {
              if (!e.target.value) return;
              setPeriod("custom");
              setToMonth(e.target.value);
            }}
            style={{ fontSize: 12.5, padding: "5px 8px" }}
          />
          {/* 🔴 엑셀은 **지금 고른 조회기간 그대로** 담는다(35차 리뷰 6라운드) —
              화면과 다른 구간을 담으면 두 숫자가 갈린다.
              🔴 불러오는 중에는 막는다 — 빈 배열이 그대로 파일이 된다. */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExportExcel}
            disabled={loading || !!error || !data}
            style={{ whiteSpace: "nowrap", fontSize: 12.5, padding: "6px 12px" }}
          >
            엑셀 다운로드
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">불러오는 중...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <>
          {/* ── 마진 요약 (35차 C-2 · 사용자 13번) ──────────────────────────────────
              🔴 **어느 마진을 쓰는지 화면에 적는다**(완료조건 20) — 이 저장소에는
                 마진이라 불리는 값이 셋 있고, 어느 것인지 안 적으면 아무도 모른다.
              🔴 **취급고는 매출이 아니다** — 선착불 운임은 화주가 차주에게 직접 주는
                 돈이라 위캐리를 거치지 않는다. 그래서 작은 글씨 보조로만 둔다. */}
          <section className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>마진 합계</div>
              <div className="num" style={{ fontSize: 30, fontWeight: 700 }}>
                {totalMargin.toLocaleString()}원
              </div>
              {/* 🔴 흐린 보조 글씨다 — 마진과 같은 크기로 올리지 말 것(위 주석 참고) */}
              <div className="num" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                ({wonVat(totalMargin)})
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                취급고(참고) {totalVolume.toLocaleString()}원
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.65 }}>
              <strong>마진 = 위캐리가 버는 돈(부가세 제외)</strong>입니다. 수금방식에 따라 계산이
              다릅니다 — <strong>주선사 정산</strong>은 「화주 청구금액 − 차주 지급금액」,
              <strong>선착불</strong>은 「주선수수료」뿐입니다(운임은 화주가 차주에게 직접 주므로
              위캐리 매출이 아닙니다).
              <br />
              「취급고」는 위캐리를 거쳐 간 운임의 크기이고 <strong>매출이 아닙니다</strong>.
              <br />
              괄호 안 <strong>부가세 포함</strong>은 세금계산서에 찍히는 금액입니다 —
              <strong>더 버는 돈이 아니라</strong> 받아서 국가에 내는 10%가 얹힌 값이니,
              실적은 앞의 공급가액으로 보십시오.
              <br />
              ⚠️ 배차 목록의 「마진·마진율」과 배차 상세의 「실질마진(정산기준)」은 계산이 다른
              별개 값입니다 — 이 화면의 숫자와 맞지 않는 것이 정상입니다.
            </p>
          </section>
          {/* 정기계약 화주 수 (33차 B장)
              🔴 위에서 고른 조회기간과 무관하게 **지금 유효한 계약 전체**를 센다 —
                 이 화면의 다른 지표(매출·마진)와 기간 기준이 다르므로 캡션으로 밝힌다.
              🔴 종료일이 지난 계약은 빠진다(`isRecurringContractActive`) — 「체크는 켜져
                 있는데 안 세어진다」는 의도된 동작이다. */}
          <section
            className="card"
            style={{ padding: 20, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>정기계약 화주</div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 0" }}>
                현재 유효한 계약 기준(종료일이 지난 계약은 제외) · 조회기간과 무관합니다.
              </p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              {!recurringList ? (
                <div style={{ fontSize: 13, color: "#e5484d", fontWeight: 700 }}>조회 실패</div>
              ) : recurringList.length === 0 ? (
                // 🔴 0개는 펼칠 것이 없으므로 버튼으로 만들지 않는다(눌러도 아무 일이 없으면
                //    고장으로 읽힌다).
                <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>
                  0개
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecurringOpen((v) => !v)}
                  aria-expanded={recurringOpen}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="num" style={{ fontSize: 22, fontWeight: 700 }}>
                    {recurringList.length}개
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {recurringOpen ? "닫기 ▲" : "명단 보기 ▼"}
                  </span>
                </button>
              )}
              {data?.recurringContractError && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {data.recurringContractError}
                </div>
              )}
            </div>
          </section>

          {/* 정기계약 화주 명단 (실사용 리뷰 — "클릭시 명단이 나오면 좋겠다")
              🔴 이름은 `<Link>` 로 화주 상세에 잇는다(원칙 31번) — 명단만 보고 끝나는 게
                 아니라 거기서 바로 계약 내용을 고칠 수 있어야 쓸모가 있다. */}
          {recurringOpen && recurringList && recurringList.length > 0 && (
            <section className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>
                정기계약 화주 명단 ({recurringList.length}개)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recurringList.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/companies/${c.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "baseline",
                      gap: 6,
                      padding: "6px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12.5,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {c.endedOn ? `~${c.endedOn}` : "기한 없음"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── A. 전사 월별 마진 추이 ────────────────────────────────────────────
              🔴 **세로 막대 그래프다**(35차 리뷰 5라운드, 사용자 지시 *"좀더 월별로
                 마진추이를 확인하기 편하게 ux를 수정하자"*). 화주포털 월별통계와
                 같은 어휘 — 막대 위 값 · 평균선 · 가로축(월·건수).
              ⚠️ 본작업에서는 **가로 막대 목록**이었다. 한 달이 한 줄이라 위아래로
                 길게 늘어져 추이가 안 읽혔다 — 그 모양으로 되돌리지 말 것.
              🔴 **포털 부품(`pv2-s*` 클래스)을 가져오지 않았다** — 그 CSS 는
                 `.portal-v2` 스코프 안이라 관리자에서는 색·간격이 안 나온다.
                 여기는 인라인 스타일이고, 그래서 `globals.css` 변경이 0 이다.
              🔴 막대는 **마진**이다(취급고가 아니다). 마진이 작은 큰 건이 가장 길게
                 그려지면 「어느 달이 잘 벌었나」를 읽을 수 없다. */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>전사 월별 마진 추이</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{periodLabel}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                실적 {activeMonthCount}개월 · 정산 {totalCount}건 · 월평균 마진{" "}
                <strong className="num">{won(avgMonthlyMargin)}</strong>{" "}
                <span className="num">({wonVat(avgMonthlyMargin)})</span>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 18 }}>
              막대 높이는 <strong>마진(부가세 제외)</strong>이고 그 아래 괄호가
              <strong>부가세 포함가</strong>입니다 · 점선은 <strong>월평균 마진</strong>
              {avgMonthlyMargin > 0 ? ` ${won(avgMonthlyMargin)}` : ""}입니다(실적이 있는 달로만
              나눕니다) · 막대에 마우스를 올리면 취급고·건수·증감이 보입니다 · 현장 추가비는
              그 이후 등록된 것까지 표시 시점에 합산합니다.
            </p>
            {activeMonthCount === 0 ? (
              <div className="empty-state">이 기간에 정산 데이터가 없습니다.</div>
            ) : (
              <>
                {/* 🔴 **스크롤 컨테이너는 하나다** — 막대와 가로축을 각자 감싸면
                    가로로 밀었을 때 축만 제자리에 남아 달이 어긋난다.
                    안쪽 두 줄이 **같은 `minWidth`·`gap`** 을 쓰는 것도 같은 이유다. */}
                <div style={{ overflowX: "auto", overflowY: "hidden" }}>
                <div
                  style={{
                    position: "relative",
                    height: 200,
                    // 🔴 `+ 24` 는 양끝 값 라벨(「1,280만」처럼 칸보다 넓다)이 잘리지 않게
                    //    두는 여백이다. 아래 두 줄의 `padding` 과 **한 벌**이라 같이 고칠 것.
                    minWidth: monthlyRows.length * 44 + 24,
                  }}
                >
                  {/* 평균선 — 실적이 있는 달로 나눈 값이다(빈 달은 안 센다) */}
                  {avgMonthlyMargin > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: `${Math.min(96, (avgMonthlyMargin / maxMonthlyMargin) * 100)}%`,
                        borderTop: "1px dashed var(--border)",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    >
                      {/* 🔴 **선 위에 숫자를 얹지 않는다 — 다시 넣지 말 것.**
                          리뷰 5라운드에는 왼쪽 끝에 「평균 148만」을 얹었는데(오른쪽은 24개월에서
                          화면 밖으로 밀렸다), 그 자리가 **첫 달 막대의 라벨 자리와 같다.**
                          7라운드에 부가세 포함가가 둘째 줄로 붙으면서 「평균 148만」 바로 아래에
                          첫 달의 「(141만)」이 놓여, **포함가가 더 작은 것처럼** 읽혔다(실측).
                          겹침은 첫 달 실적이 평균 근처면 언제든 나므로 자리를 옮겨도 재발한다 —
                          그래서 값은 **위 머리줄과 아래 안내문**이 말하고 선은 선만 긋는다. */}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      height: "100%",
                      padding: "0 12px",
                    }}
                  >
                    {monthlyRows.map((r, idx) => {
                      const prev = idx > 0 ? monthlyRows[idx - 1] : null;
                      // 🔴 증감률도 마진 기준이다 — 취급고가 늘어도 마진이 줄면 나쁜 달이다
                      const changePct =
                        prev && prev.margin > 0
                          ? Math.round(((r.margin - prev.margin) / prev.margin) * 100)
                          : null;
                      const isMax = r.margin === maxMonthlyMargin && r.margin > 0;
                      return (
                        <div
                          key={r.period}
                          title={`${r.period} · 마진 ${won(r.margin)} (${wonVat(r.margin)}) · 취급고 ${won(r.revenue)} · ${r.count}건${
                            changePct !== null ? ` · 전월 대비 ${changePct >= 0 ? "+" : ""}${changePct}%` : ""
                          }`}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                            height: "100%",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              whiteSpace: "nowrap",
                              fontWeight: isMax ? 800 : 600,
                              color: r.margin === 0 ? "var(--text-muted)" : "inherit",
                            }}
                          >
                            {manwon(r.margin)}
                          </span>
                          {/* 🔴 둘째 줄이다 — 같은 줄에 붙이면 24개월에서 막대끼리 겹친다.
                              값이 0인 달은 아예 그리지 않는다(「(—)」가 되어 어수선해진다). */}
                          {r.margin !== 0 && (
                            <span
                              style={{
                                fontSize: 9.5,
                                whiteSpace: "nowrap",
                                color: "var(--text-muted)",
                                marginTop: -4,
                              }}
                            >
                              {manwonVat(r.margin)}
                            </span>
                          )}
                          <div
                            style={{
                              width: "70%",
                              maxWidth: 40,
                              // 🔴 0 인 달도 2px 은 그린다 — 아무것도 없으면 「그 달이 빠졌나」로 읽힌다
                              height:
                                r.margin <= 0
                                  ? 2
                                  : `${Math.max(3, Math.round((r.margin / maxMonthlyMargin) * 100))}%`,
                              background:
                                r.margin <= 0 ? "var(--border)" : isMax ? "#1a1a1a" : "var(--brand-yellow)",
                              borderRadius: "6px 6px 2px 2px",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* 가로축 — 월·건수. 위 막대와 **같은 gap·minWidth** 라야 칸이 맞는다 */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 4,
                    borderTop: "1px solid var(--border)",
                    minWidth: monthlyRows.length * 44 + 24,
                    padding: "8px 12px 0",
                  }}
                >
                  {monthlyRows.map((r) => (
                    <div
                      key={r.period}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                        {shortMonth(r.period, showYear)}
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{r.count}건</span>
                    </div>
                  ))}
                </div>
                </div>
              </>
            )}
          </section>

          {/* C. 화주별 수익성 순위 */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>화주별 수익성 순위 (TOP 10)</div>
            {customerRows.length === 0 ? (
              <div className="empty-state">이 기간에 등록된 오더가 없습니다.</div>
            ) : (
              customerRows.map((r, idx) => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div className="num" style={{ width: 24, color: "var(--accent)", fontWeight: 800, fontSize: 13 }}>
                    {idx + 1}
                  </div>
                  <div style={{ width: 130, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </div>
                  <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                    <div
                      style={{
                        width: `${(Math.abs(r.margin) / maxCustomerMargin) * 100}%`,
                        background: "var(--accent)",
                        height: "100%",
                        borderRadius: 8,
                        minWidth: r.margin !== 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  {/* 🔴 부가세 포함가는 **아랫줄 흐린 글씨**다(리뷰 7라운드) — 같은 줄에
                      이어 붙이면 취급고 칸을 민다.
                      🔴 **칸이 150px 이고 `nowrap` 이다 — 120px 으로 되돌리지 말 것.**
                         8자리 금액에서 「원)」이 아랫줄로 떨어졌다(24개월 표본 실측).
                         넓힌 30px 은 옆의 막대(`flex: 1`)에서 가져오므로 다른 칸은 안 밀린다. */}
                  <div className="num" style={{ width: 150, textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{won(r.margin)}</div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-muted)",
                        marginTop: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ({wonVat(r.margin)})
                    </div>
                  </div>
                  <div className="num" style={{ width: 110, textAlign: "right", fontSize: 11.5, color: "var(--text-muted)" }}>
                    취급고 {won(r.revenue)}
                  </div>
                  <div style={{ width: 50, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    {r.orderCount}건
                  </div>
                </div>
              ))
            )}
          </section>

          {/* D. 클레임·현장추가비 통계 */}
          <section className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>클레임·현장추가비 통계</div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>클레임·사고</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>전체 클레임 건수</div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>{claimStats.totalCount}건</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    확정 배상액 합계 (처리완료 기준, {claimStats.compensationCount}건)
                  </div>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>{won(claimStats.compensationTotal)}</div>
                </div>
                <div className="card" style={{ padding: 16, background: "var(--bg)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>청구액 합계 (참고, 상태 무관)</div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>
                    {won(claimStats.claimAmountRefTotal)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
                {CLAIM_TYPES.map((t) => (
                  <span key={t}>
                    {getClaimTypeLabel(t)} {claimStats.typeCounts[t] || 0}건
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>현장 추가비 (카테고리별)</div>
              {extraChargeCategoryRows.map((r) => (
                <div
                  key={r.category}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span>{r.label}</span>
                  <span className="num" style={{ color: "var(--text-muted)" }}>
                    {r.count}건 · 화주 {won(r.customerAmount)} / 차주 {won(r.driverAmount)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* B. 담당자별 영업 성과 — 🔴 **맨 아래다**(35차 리뷰 5라운드, 사용자 지시
              *"담당자별 영업 성과는 지금은 그렇게 중요한 부분이 아니라 하단으로 배치"*).
              ⚠️ 본작업에서는 월별 추이 바로 다음이었다 — 그 순서로 되돌리지 말 것. */}
          <section className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>담당자별 영업 성과</div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
              「오더 처리 담당자」(오더 등록·수정 담당자) 기준이며, 견적 상담·정산 등록
              담당자와 다를 수 있습니다. 오더는 <strong>등록월</strong>로 자릅니다.
            </p>
            {staffRows.length === 0 ? (
              <div className="empty-state">이 기간에 등록된 오더가 없습니다.</div>
            ) : (
              staffRows.map((r) => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ flex: 1, background: "var(--bg)", borderRadius: 8, overflow: "hidden", height: 26 }}>
                    <div
                      style={{
                        width: `${(Math.abs(r.margin) / maxStaffMargin) * 100}%`,
                        background: "var(--accent)",
                        height: "100%",
                        borderRadius: 8,
                        minWidth: r.margin !== 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  {/* 🔴 부가세 포함가는 **아랫줄 흐린 글씨**다(리뷰 7라운드) — 같은 줄에
                      이어 붙이면 취급고 칸을 민다.
                      🔴 **칸이 150px 이고 `nowrap` 이다 — 120px 으로 되돌리지 말 것.**
                         8자리 금액에서 「원)」이 아랫줄로 떨어졌다(24개월 표본 실측).
                         넓힌 30px 은 옆의 막대(`flex: 1`)에서 가져오므로 다른 칸은 안 밀린다. */}
                  <div className="num" style={{ width: 150, textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{won(r.margin)}</div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-muted)",
                        marginTop: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ({wonVat(r.margin)})
                    </div>
                  </div>
                  <div className="num" style={{ width: 110, textAlign: "right", fontSize: 11.5, color: "var(--text-muted)" }}>
                    취급고 {won(r.revenue)}
                  </div>
                  <div style={{ width: 50, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    {r.orderCount}건
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import MixableBadge from "@/components/MixableBadge";
import Pv2Select from "@/components/pv2/Pv2Select";
import { useListSearchSort } from "@/lib/useListSearchSort";
// 🔴 `DateRangeFilter` 컴포넌트는 관리자 화면 여러 곳이 같이 쓴다 — 모양을 시안에
//    맞추려고 그 컴포넌트를 고치면 관리자가 같이 바뀐다. 계산 함수만 가져다 쓰고
//    칩은 이 화면에서 시안 모양으로 그린다.
import { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { calcVatAmount } from "@/lib/vat";
import { downloadQuoteExcel } from "@/lib/quoteExcel";
import {
  quoteStatusStyle,
  isQuoteConfirmed,
  REJECTED_REQUEST_STYLE,
} from "@/lib/quoteStatusLabels";
import { shortAddress } from "@/lib/shortAddress";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

/**
 * 🔴 금액이 아직 없는 견적은 「협의 중」으로 보여준다(시안 실측).
 *    `-` 로 두면 화주는 "0원인가?" 하고 되묻는다 — 담당자가 아직 값을 안 넣은 것이다.
 */
function won(n: number | null | undefined, fallback = "-") {
  if (n === null || n === undefined) return fallback;
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

/** 「2026. 8. 20.」 — 시안 실측. `8월 20일` 형태로 되돌리지 말 것(줄이 길어져 밀린다). */
function dateLabel(v: string | null) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("ko-KR");
}

/** 「2026. 08. 21. 오전 09:00」 — 시안 실측. ko-KR 은 12시간제라 오전/오후가 붙는다. */
function dateTimeLabel(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERIOD_CHIPS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번주" },
  { value: "month", label: "이번달" },
  { value: "all", label: "전체" },
];

/**
 * 🔴 견적 전 「발주 요청」도 이 목록에 섞는다(27차, 사용자 확정 2026-08-28).
 *
 * 26차가 「내 요청 내역」을 지우면서 반려 건을 볼 곳이 사라졌다. 승인된 건은 견적으로
 * 전환돼 이 목록에 이미 있지만, 반려된 건은 문자 말고는 확인할 화면이 없었다.
 * 화주는 사이드바 배지만 보고 무엇이 반려됐는지 모른다.
 *
 * 🔴 **`대기중` 도 넣는다**(리뷰 확정 2026-08-28) — 화주가 발주 요청을 보내면 **그 순간**
 *    이 목록에 「상담 중」으로 떠야 한다. 안 그러면 담당자가 견적을 저장하기 전까지 화주
 *    화면에 아무것도 없어서 "요청이 접수되긴 한 건가" 하고 다시 문의한다.
 * 🔴 **`승인됨` 은 넣지 않는다** — 담당자가 견적을 저장하는 순간 요청이 `승인됨` 이 되고
 *    (`app/admin/quotes/page.tsx` 가 `status='승인됨'` + `quote_id` 를 함께 쓴다) 같은 건이
 *    **견적으로** 이 목록에 뜬다. 넣으면 같은 건이 두 번 보인다.
 * 🔴 **반려 사유(`staff_note`)를 반드시 보여준다** — 사유 없이 "반려"만 뜨면 화주가
 *    다시 문의한다. 그러면 이 화면을 만든 이유가 없어진다.
 */
type Row =
  | { kind: "quote"; id: string; created_at: string; sortAmount: number | null; data: any }
  | { kind: "request"; id: string; created_at: string; sortAmount: number | null; data: any };

type QuoteItem = { id: string; item_name: string | null; amount: number | null };

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "견적일 최신순" },
  { value: "created_at:asc", label: "견적일 오래된순" },
  { value: "final_amount:desc", label: "금액 높은순" },
  { value: "final_amount:asc", label: "금액 낮은순" },
];

/** 승인 버튼이 뜨는 유일한 상태 — 「견적 도착」 */
const APPROVABLE_STATUS = "견적제출";

export default function CustomerQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<DatePreset>("all");
  // 🔴 한 번에 하나만 펼친다 — 여러 장이 동시에 열리면 카드가 화면을 넘어가
  //    화주가 목록을 훑을 수 없다(시안도 하나만 열린 모양이다).
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [itemsByQuote, setItemsByQuote] = useState<Record<string, QuoteItem[]>>({});
  // 엑셀 생성 중인 견적 id(버튼 중복 클릭 방지)
  const [excelBusyId, setExcelBusyId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  // 견적 승인 확인 모달
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  async function handleExcel(quoteId: string) {
    setExcelBusyId(quoteId);
    setPageError(null);
    try {
      await downloadQuoteExcel(supabase, quoteId);
    } catch (e: any) {
      setPageError(e?.message || "견적서 엑셀을 만들지 못했습니다.");
    } finally {
      setExcelBusyId(null);
    }
  }

  /** 펼칠 때 그 견적의 가산 내역만 가져온다 — 목록 전체를 미리 받으면 느려진다 */
  async function toggle(row: Row) {
    const key = `${row.kind}-${row.id}`;
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(key);
    if (row.kind === "quote" && !itemsByQuote[row.id]) {
      const { data, error } = await supabase
        .from("quote_items")
        .select("id,item_name,amount")
        .eq("quote_id", row.id);
      // 🔴 error 를 삼키지 않는다 — 가산 내역이 조용히 비면 금액이 안 맞아 보인다
      if (error) setPageError(`가산 내역을 불러오지 못했습니다: ${error.message}`);
      setItemsByQuote((prev) => ({ ...prev, [row.id]: data || [] }));
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setApproveBusy(true);
    setApproveError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setApproveError("로그인이 만료되었습니다. 다시 로그인해주세요.");
        return;
      }
      const res = await fetch("/api/customer/approve-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ quote_id: approveTarget.id }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApproveError(json?.error || "승인하지 못했습니다.");
        return;
      }
      setApproveTarget(null);
      await load();
    } catch (e: any) {
      setApproveError(e?.message || "승인하지 못했습니다.");
    } finally {
      setApproveBusy(false);
    }
  }

  // 견적과 반려된 발주 요청을 한 목록으로 합친다 — 화주에게는 둘 다 "내가 보낸 건의
  // 결과"라 따로 두면 어디를 봐야 하는지 또 갈린다.
  const allRows: Row[] = useMemo(
    () => [
      ...quotes.map((q) => ({
        kind: "quote" as const,
        id: q.id,
        created_at: q.created_at,
        sortAmount: q.final_amount ?? null,
        data: q,
      })),
      ...requests.map((r) => ({
        kind: "request" as const,
        id: r.id,
        created_at: r.created_at,
        // 금액이 없는 건이라 금액 정렬에서는 항상 뒤로 간다
        sortAmount: null,
        data: r,
      })),
    ],
    [quotes, requests]
  );

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return allRows;
    return allRows.filter((r) => r.created_at && r.created_at >= from);
  }, [allRows, period]);

  const {
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    result: visibleRows,
  } = useListSearchSort<Row>(
    periodFiltered,
    // 🔴 시안 실측 — 견적번호 · 구간 · 품목이 검색 대상이다
    (r) => [
      r.kind === "quote" ? r.data.quote_no : "발주 요청",
      r.data.origin,
      r.data.destination,
      r.data.item,
      r.data.vehicle_type,
    ],
    {
      created_at: (r) => r.created_at,
      final_amount: (r) => r.sortAmount,
    },
    "created_at",
    "desc"
  );

  async function load() {
    // 🔴 `error` 를 삼키지 않는다 — 조회가 실패하면 조용히 빈 목록이 되어 화주에게는
    //    "견적이 없다" 로 보인다(원칙 55번, 25차에 실제로 겪은 사고).
    const { data, error } = await supabase
      .from("quotes")
      .select(
        "id,quote_no,origin,destination,vehicle_type,item,base_fare,final_amount,status,selected_options,loading_type,notes,requested_pickup_at,requested_dropoff_at,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setPageError(`견적을 불러오지 못했습니다: ${error.message}`);
    setQuotes(data || []);

    // 🔴 `대기중`(=「상담 중」)과 `반려` 만 가져온다 — `승인됨` 은 이미 견적으로 전환돼
    //    위 목록에 있어서 넣으면 같은 건이 두 번 보인다.
    //    ⚠️ 이 표에는 status CHECK 제약이 없다(실측) — 값은 코드가 쓰는 문자열이다.
    const { data: rej, error: rErr } = await supabase
      .from("portal_order_requests")
      .select(
        "id,origin,destination,vehicle_type,body_type,item,item_condition,trip_type,load_condition,unload_condition,transport_time,waiting_minutes,waypoint_count,requested_pickup_at,requested_dropoff_at,notes,staff_note,status,created_at"
      )
      .in("status", ["대기중", "반려"])
      .limit(100);
    if (rErr) setPageError(`발주 요청을 불러오지 못했습니다: ${rErr.message}`);
    setRequests(rej || []);

    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_quotes_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => load())
      // 반려 건도 이 목록에 섞이므로 같이 구독한다 — 안 하면 담당자가 반려한 뒤에도
      // 새로고침 전까지 화주 화면에 안 나타난다.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portal_order_requests" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <div className="pv2-page-head pv2-page-head-tight">
        <h1 className="pv2-page-title">견적 확인</h1>
        <p className="pv2-page-desc">
          받으신 견적 내역입니다. 운송이 확정되면 배차·운송 조회에서 진행 상황을 볼 수 있습니다.
          (부가세 별도)
        </p>
      </div>

      <div className="pv2-filter-row">
        <div className="pv2-chipgroup">
          {PERIOD_CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`pv2-fchip${period === c.value ? " pv2-fchip-on" : ""}`}
              onClick={() => setPeriod(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="pv2-search"
          type="text"
          placeholder="견적번호 · 구간 · 품목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="견적 검색"
        />
        {/* 🔴 네이티브 select 를 쓰지 않는다(원칙 57번) — 26차가 포털에서 걷어낸 것이다.
            시안에는 정렬 컨트롤이 없지만 현행 기능이라 없애지 않고 부품만 바꿨다. */}
        <Pv2Select
          // 🔴 `.pv2-selectwrap` 이 `width:100%` 라 그대로 두면 필터 줄에서 한 줄을
          //    통째로 차지하며 아래로 밀린다(26차 ④ 와 같은 지점). 폭은 래퍼에 준다.
          wrapStyle={{ flex: "none", width: "auto", minWidth: 168 }}
          value={`${sortKey}:${sortDir}`}
          onChange={(v) => {
            const [key, dir] = v.split(":");
            setSortKey(key);
            setSortDir(dir as "asc" | "desc");
          }}
          ariaLabel="정렬 기준"
          options={SORT_OPTIONS}
        />
      </div>

      {/* 실패는 화면 전체를 덮지 않고 인라인 배너로만 알린다(원칙 33번) */}
      {pageError && (
        <div className="pv2-alert pv2-alert-error" style={{ marginBottom: 14 }}>
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="pv2-empty">불러오는 중...</div>
      ) : visibleRows.length === 0 ? (
        <div className="pv2-card-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/portal/wecarry-eng-cropped.svg"
            alt=""
            className="pv2-empty-logo"
            style={{ width: 106 }}
          />
          <div className="pv2-card-empty-title">
            {allRows.length === 0 ? "아직 받은 견적이 없습니다" : "조건에 맞는 견적이 없습니다"}
          </div>
          <div className="pv2-card-empty-desc">
            {allRows.length === 0
              ? "발주 요청을 보내시면 담당자가 확인 후 견적을 보내드립니다."
              : "기간이나 검색어를 바꿔보세요."}
          </div>
        </div>
      ) : (
        <div className="pv2-qlist">
          {visibleRows.map((row) => {
            const q = row.data;
            const key = `${row.kind}-${row.id}`;
            const open = openKey === key;
            // 견적 전 발주 요청 — `대기중` 은 「상담 중」, `반려` 는 「접수 반려」
            const isRequest = row.kind === "request";
            const isRejected = isRequest && q.status === "반려";
            const st = isRequest
              ? isRejected
                ? REJECTED_REQUEST_STYLE
                : quoteStatusStyle("상담중")
              : quoteStatusStyle(q.status);
            const opts = q.selected_options || {};

            // 반려 건(`portal_order_requests`)은 flat 컬럼이고 견적은 `selected_options`
            // jsonb 다 — 같은 화면에 그리려면 여기서 한 모양으로 맞춰야 한다.
            const cargo = isRequest
              ? {
                  vehicle: [q.vehicle_type, q.body_type].filter(Boolean).join(" · "),
                  condition: q.item_condition,
                  trip: q.trip_type,
                  load: q.load_condition,
                  unload: q.unload_condition,
                  wait: q.waiting_minutes,
                  waypoint: q.waypoint_count,
                  time: q.transport_time,
                }
              : {
                  vehicle: [q.vehicle_type, opts["차량형태"]].filter(Boolean).join(" · "),
                  condition: opts["물품특성"],
                  trip: opts["왕복/편도"],
                  load: opts["상차조건"],
                  unload: opts["하차조건"],
                  wait: opts["대기시간_분"],
                  waypoint: opts["경유지수"],
                  time: opts["운송시간"],
                };

            const items = itemsByQuote[row.id] || [];
            const supply: number | null = isRequest ? null : (q.final_amount ?? null);
            const priceless = !supply;

            return (
              <article key={key} className={`pv2-qcard${open ? " pv2-qcard-open" : ""}`}>
                <div className="pv2-qhead">
                  <span className="pv2-qstatus" style={{ color: st.color, background: st.bg }}>
                    {st.label}
                  </span>
                  {/* 모바일에서만 배지 옆에 오는 날짜 — CSS 가 하나만 보여준다 */}
                  <span className="pv2-qdate pv2-qdate-m">{dateLabel(row.created_at)}</span>
                  <div className="pv2-qbody">
                    <div className="pv2-qtop">
                      <span className="pv2-qno">{isRequest ? "발주 요청" : q.quote_no}</span>
                      <span className="pv2-qdate pv2-qdate-d">{dateLabel(row.created_at)}</span>
                      {!isRequest && q.loading_type === "mixable" && <MixableBadge />}
                    </div>
                    <div className="pv2-qroute">
                      {shortAddress(q.origin) || "-"} <span className="pv2-qarrow">→</span>{" "}
                      {shortAddress(q.destination) || "-"}
                    </div>
                    {/* 🔴 사유 없이 "반려"만 뜨면 화주가 다시 문의한다 — 이 화면을 만든
                        이유가 없어진다. 담당자가 사유를 안 적었으면 그렇다고 말해준다. */}
                    {isRejected && (
                      <div className="pv2-qreason">
                        {q.staff_note
                          ? `반려 사유 · ${q.staff_note}`
                          : `반려 사유가 기재되지 않았습니다. 고객센터(${COMPANY_SUPPORT_PHONE})로 문의해주세요.`}
                      </div>
                    )}
                  </div>
                  <div className="pv2-qright">
                    {!isRequest && (
                      <div className="pv2-qprice-wrap">
                        {priceless ? (
                          // 🔴 금액이 없으면 라벨도 없다 — 「견적 금액」이라 써두고 값이
                          //    「협의 중」이면 견적이 나온 것처럼 읽힌다(시안 실측)
                          <div className="pv2-qprice-soft">협의 중</div>
                        ) : (
                          <>
                            <div className="pv2-qvat">견적 금액 (부가세 별도)</div>
                            <div className="pv2-qprice">{won(supply)}</div>
                          </>
                        )}
                      </div>
                    )}
                    {!isRequest && q.status === APPROVABLE_STATUS && !priceless && (
                      <button
                        type="button"
                        className="pv2-qapprove"
                        onClick={() => {
                          setApproveError(null);
                          setApproveTarget(q);
                        }}
                      >
                        견적 승인
                      </button>
                    )}
                    <button
                      type="button"
                      className={`pv2-qtoggle${open ? " pv2-qtoggle-on" : ""}`}
                      aria-expanded={open}
                      onClick={() => toggle(row)}
                    >
                      {open ? "접기" : "상세 보기"}
                      <span className="pv2-qcaret" aria-hidden="true">
                        {open ? "▲" : "▼"}
                      </span>
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="pv2-qexp">
                    <section className="pv2-qsec">
                      <div className="pv2-qsec-title">운송 구간</div>
                      <div className="pv2-qgrid pv2-qgrid-1">
                        <div className="pv2-qkv">
                          <span className="pv2-qk">출발지</span>
                          <span className="pv2-qv">{q.origin || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">도착지</span>
                          <span className="pv2-qv">{q.destination || "-"}</span>
                        </div>
                      </div>
                    </section>

                    <section className="pv2-qsec">
                      <div className="pv2-qsec-title">화물 · 차량</div>
                      <div className="pv2-qgrid">
                        <div className="pv2-qkv">
                          <span className="pv2-qk">차량</span>
                          <span className="pv2-qv">{cargo.vehicle || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">물품특성</span>
                          <span className="pv2-qv">{cargo.condition || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">품목</span>
                          <span className="pv2-qv">{q.item || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">왕복/편도</span>
                          <span className="pv2-qv">{cargo.trip || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">상차조건</span>
                          <span className="pv2-qv">{cargo.load || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">하차조건</span>
                          <span className="pv2-qv">{cargo.unload || "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">대기시간</span>
                          {/* 0 은 "없음"이라 `-` 로 그린다 — 「0분」은 값이 있는 것처럼 읽힌다 */}
                          <span className="pv2-qv">{cargo.wait ? `${cargo.wait}분` : "-"}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">경유지</span>
                          <span className="pv2-qv">{`${Number(cargo.waypoint) || 0}곳`}</span>
                        </div>
                      </div>
                    </section>

                    <section className="pv2-qsec">
                      <div className="pv2-qsec-title">일정</div>
                      <div className="pv2-qgrid">
                        <div className="pv2-qkv">
                          <span className="pv2-qk">희망 상차</span>
                          <span className="pv2-qv">{dateTimeLabel(q.requested_pickup_at)}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">희망 하차</span>
                          <span className="pv2-qv">{dateTimeLabel(q.requested_dropoff_at)}</span>
                        </div>
                        <div className="pv2-qkv">
                          <span className="pv2-qk">운송시간</span>
                          <span className="pv2-qv">{cargo.time || "-"}</span>
                        </div>
                      </div>
                    </section>

                    <section className="pv2-qsec">
                      <div className="pv2-qsec-title">요청사항</div>
                      <div className="pv2-qgrid pv2-qgrid-1">
                        <div className="pv2-qkv">
                          <span className="pv2-qk">내용</span>
                          <span className="pv2-qv" style={{ whiteSpace: "pre-wrap" }}>
                            {q.notes || "-"}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* 🔴 견적 전 발주 요청에는 운임 내역·견적서 버튼이 없다 */}
                    {!isRequest && (
                      <section className="pv2-qsec">
                        <div className="pv2-qsec-title">운임 내역</div>
                        <div className="pv2-qfare">
                          <div className="pv2-qfare-i">
                            <div className="pv2-qfare-k">기본운임</div>
                            <div className="pv2-qfare-v">
                              {q.base_fare ? won(q.base_fare) : priceless ? "협의 중" : "-"}
                            </div>
                          </div>
                          {items.map((it) => (
                            <div key={it.id} className="pv2-qfare-i">
                              <div className="pv2-qfare-k">{it.item_name || "가산"}</div>
                              <div className="pv2-qfare-v">{won(it.amount)}</div>
                            </div>
                          ))}
                          <div className="pv2-qfare-i">
                            <div className="pv2-qfare-k">부가세</div>
                            {/* 🔴 금액이 없으면 부가세도 계산하지 않는다 — 0원으로 찍으면
                                확정된 금액처럼 보인다 */}
                            <div className="pv2-qfare-v">
                              {priceless ? "-" : won(calcVatAmount(supply as number))}
                            </div>
                          </div>
                          <div className="pv2-qfare-i pv2-qfare-total">
                            <div className="pv2-qfare-k">합계 (부가세 별도)</div>
                            <div className="pv2-qfare-v">{priceless ? "협의 중" : won(supply)}</div>
                          </div>
                        </div>
                      </section>
                    )}

                    {!isRequest && (
                      <div className="pv2-qfoot">
                        {/* 🔴 「운송 확정」일 때만 — 그 전에는 배차 자체가 없어 빈 화면이다 */}
                        {isQuoteConfirmed(q.status) && (
                          <button
                            type="button"
                            className="pv2-qfoot-link"
                            onClick={() => router.push("/customer/dispatches")}
                          >
                            배차·운송 조회에서 진행 상황 보기 →
                          </button>
                        )}
                        <span className="pv2-qfoot-sp" />
                        <button
                          type="button"
                          className="pv2-qbtn"
                          onClick={() => window.open(`/customer/quotes/${q.id}/print`, "_blank")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/portal/pdf-icon.svg" alt="" style={{ width: 16, height: 16 }} />
                          PDF
                        </button>
                        {/* 엑셀은 새 탭 없이 그 자리에서 내려받는다. 조회는 로그인 세션으로
                            하므로 RLS 가 본인 회사 견적만 내려준다. */}
                        <button
                          type="button"
                          className="pv2-qbtn"
                          disabled={excelBusyId === q.id}
                          onClick={() => handleExcel(q.id)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/portal/excel-icon.svg"
                            alt=""
                            style={{ width: 16, height: 16 }}
                          />
                          엑셀
                        </button>
                        <button
                          type="button"
                          className="pv2-qbtn pv2-qbtn-dark"
                          onClick={() => router.push(`/customer/quotes/${q.id}`)}
                        >
                          견적서 상세 보기
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* 견적 승인 확인 — 🔴 한 번 누르면 담당자가 배차를 시작한다. 확인 없이 바로
          바꾸지 말 것(시안도 확인 모달을 그린다). */}
      {approveTarget && (
        <div
          className="pv2-modal-dim"
          role="presentation"
          onClick={() => !approveBusy && setApproveTarget(null)}
        >
          <div
            className="pv2-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pv2-approve-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pv2-modal-title" id="pv2-approve-title">
              이 견적을 승인할까요?
            </div>
            <div className="pv2-modal-desc">
              승인하면 정식 운송오더로 접수되어 담당자가 배차를 시작합니다.
            </div>
            <div className="pv2-qapv-box">
              <div className="pv2-qapv-row">
                <span className="pv2-qapv-k">견적번호</span>
                <span className="pv2-qapv-v">{approveTarget.quote_no || "-"}</span>
              </div>
              <div className="pv2-qapv-row">
                <span className="pv2-qapv-k">운송 구간</span>
                <span className="pv2-qapv-v">
                  {shortAddress(approveTarget.origin) || "-"} →{" "}
                  {shortAddress(approveTarget.destination) || "-"}
                </span>
              </div>
              <div className="pv2-qapv-rule" />
              <div className="pv2-qapv-row">
                <span className="pv2-qapv-k">견적 금액 (부가세 별도)</span>
                <span className="pv2-qapv-v pv2-qapv-amount">{won(approveTarget.final_amount)}</span>
              </div>
            </div>
            {approveError && (
              <div className="pv2-alert pv2-alert-error" style={{ marginTop: 14 }}>
                {approveError}
              </div>
            )}
            <div className="pv2-modal-actions">
              <button
                type="button"
                className="pv2-modal-cancel"
                disabled={approveBusy}
                onClick={() => setApproveTarget(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="pv2-modal-confirm pv2-modal-confirm-yellow"
                disabled={approveBusy}
                onClick={handleApprove}
              >
                {approveBusy ? "승인 중..." : "견적 승인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

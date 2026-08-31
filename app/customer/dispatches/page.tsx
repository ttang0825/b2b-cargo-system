"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import MixableBadge from "@/components/MixableBadge";
import {
  getCustomerCollectionMethodLabel,
  getCustomerBillingCycleLabel,
  getPaymentConditionLabel,
  CUSTOMER_COLLECTION_AXIS_LABEL,
  CUSTOMER_BILLING_AXIS_LABEL,
} from "@/lib/settlementLabels";
import { useListSearchSort } from "@/lib/useListSearchSort";
import { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import Pv2Select from "@/components/pv2/Pv2Select";
import {
  getDispatchStage,
  hasDispatchIssue,
  DISPATCH_STAGE_LABELS,
  DISPATCH_ISSUE_STYLE,
} from "@/lib/dispatchStage";

const PERIOD_CHIPS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번주" },
  { value: "month", label: "이번달" },
  { value: "all", label: "전체" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "최신 등록순" },
  { value: "requested_pickup_at:asc", label: "상차 빠른순" },
  { value: "requested_pickup_at:desc", label: "상차 늦은순" },
  { value: "stage:asc", label: "진행 단계순" },
];

function shortDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  // 🔴 관리자 화면과 같은 24시간 `HH:mm` 이다(56차 확정) — `hour12` 를 지정하지
  //    않으면 「오전」이 붙어 화면마다 형식이 갈린다(59차 ⑩).
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

/**
 * 🔴 알약 3개의 색 — 시안 실측값이다(`i === c3` 기준).
 *
 *    현재 단계만 옐로로 채우고, 지난 단계는 검은 테두리 + 흰 배경, 남은 단계는
 *    옅은 테두리 + 회색 글자다. 연결선도 지난 구간과 남은 구간의 색이 다르다.
 */
function stepStyle(i: number, cur: number) {
  return {
    bg: i === cur ? "#FFD833" : "#FFFFFF",
    bd: i === cur ? "#FFD833" : i < cur ? "#1A1A1A" : "#EBEAE7",
    color: i > cur ? "#BAB9B6" : "#1A1A1A",
    subColor: i === cur ? "rgba(26,26,26,.6)" : i < cur ? "#888378" : "#BAB9B6",
    fw: i === cur ? 800 : i < cur ? 700 : 600,
    line: i < cur ? "#BAB9B6" : "#EBEAE7",
  };
}

export default function CustomerDispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DatePreset>("all");

  const periodFiltered = useMemo(() => {
    const { from } = getDateRange(period);
    if (!from) return dispatches;
    return dispatches.filter((d) => d.created_at && d.created_at >= from);
  }, [dispatches, period]);

  const {
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    result: visibleDispatches,
  } = useListSearchSort(
    periodFiltered,
    (d) => [
      d.orders?.order_no,
      d.orders?.origin,
      d.orders?.destination,
      d.orders?.item,
      // 🔴 화주에게 보이는 말로 검색한다 — 화면에는 3단계 라벨이 뜨는데 검색은
      //    DB 6종으로만 되면 「배차완료」로 검색해도 안 걸린다.
      DISPATCH_STAGE_LABELS[getDispatchStage(d)],
      hasDispatchIssue(d) ? DISPATCH_ISSUE_STYLE.label : null,
    ],
    {
      created_at: (d) => d.created_at,
      requested_pickup_at: (d) => d.orders?.requested_pickup_at,
      stage: (d) => getDispatchStage(d),
    },
    "created_at",
    "desc"
  );

  useEffect(() => {
    async function load() {
      // 🔴 `pickup_confirmed`·`delivery_confirmed` 를 빼지 말 것 — 「문제발생」은
      //    상태값을 덮어써서 단계를 알 수 없고, 이 두 boolean 으로만 복원된다.
      // 🔴 `driver_payout_amount` 등 차주 지급 정보는 조회하지 않는다(DB GRANT 가
      //    막고 있고, 화주에게 보일 값이 아니다).
      const { data, error } = await supabase
        .from("dispatches")
        .select(
          "id,dispatch_status,pickup_confirmed,delivery_confirmed,issue_occurred,created_at,orders(order_no,origin,destination,requested_pickup_at,item,vehicle_type,loading_type,collection_method,billing_cycle,direct_collection_point)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      // 🔴 조회 실패를 삼키면 "저장은 됐는데 목록이 빈" 상태가 되고 원인을 짚을
      //    단서가 없다(원칙 55번).
      if (error) setPageError(error.message);
      else setPageError(null);
      setDispatches(data || []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("customer_dispatches_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="container">
      <div className="pv2-page-head-tight">
        <h1 className="pv2-page-title">배차·운송 조회</h1>
        <p className="pv2-page-desc">진행 중인 운송의 실시간 상태를 확인하세요.</p>
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
          placeholder="오더번호 · 구간 · 품목 · 상태 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="배차 검색"
        />
        {/* 🔴 네이티브 select 를 쓰지 않는다(원칙 57번). 시안에 정렬 컨트롤이 없지만
            현행 기능이라 없애지 않고 부품만 바꿨다(27차 ⑧(b) 와 같은 판단).
            폭은 트리거가 아니라 래퍼에 준다(26차 ⑫). */}
        <Pv2Select
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
      ) : visibleDispatches.length === 0 ? (
        <div className="pv2-card-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/portal/wecarry-eng-cropped.svg"
            alt=""
            className="pv2-empty-logo"
            style={{ width: 106 }}
          />
          <div className="pv2-card-empty-title">
            {dispatches.length === 0 ? "진행 중인 운송이 없습니다" : "조건에 맞는 운송이 없습니다"}
          </div>
          <div className="pv2-card-empty-desc">
            {dispatches.length === 0
              ? "견적을 확정하면 배차가 시작되고 이곳에서 실시간 상태를 확인할 수 있습니다."
              : "기간이나 검색어를 바꿔보세요."}
          </div>
        </div>
      ) : (
        <div className="pv2-dlist">
          {visibleDispatches.map((d) => {
            const o = d.orders || {};
            const stage = getDispatchStage(d);
            const issue = hasDispatchIssue(d);
            const created = shortDate(d.created_at);
            const pickup = shortDate(o.requested_pickup_at);
            const subs = [
              created ? `${created} 접수` : "접수",
              stage >= 1 ? "차량 배차됨" : "배차 대기",
              // 🔴 완료 알약에 일시를 넣지 말 것 — `dispatches` 에 완료 시각 컬럼이
              //    아예 없다(53차 ⑦). 「완료」 한 단어로 끝낸다.
              stage === 2 ? "완료" : pickup ? `${pickup} 예정` : "예정",
            ];
            const settleLabel = getCustomerCollectionMethodLabel(o.collection_method);
            const cycleLabel = getCustomerBillingCycleLabel(o.billing_cycle);
            const condition = getPaymentConditionLabel(o.direct_collection_point);
            return (
              <article key={d.id} className="pv2-dcard">
                <div className="pv2-dhead">
                  <div className="pv2-dno-line">
                    <span className="pv2-dno num">{o.order_no || "-"}</span>
                    <span className="pv2-dpickup">상차 {shortDateTime(o.requested_pickup_at)}</span>
                  </div>
                  <div className="pv2-droute">
                    <span>{o.origin || "-"}</span> <span className="pv2-arrow-glyph">→</span>{" "}
                    <span>{o.destination || "-"}</span>
                  </div>
                  <div className="pv2-dpickup-m">상차 {shortDateTime(o.requested_pickup_at)}</div>
                  {/* 🔴 「· 배차 차량 …」 을 붙이지 말 것 — 차주 성명·연락처·차량번호는
                      화주에게 노출하지 않는다(사용자 확정 9번). 마스킹도 하지 않는다.
                      화주가 알아야 할 것은 "배차됐는가"이고 그건 알약 보조 텍스트가
                      이미 「배차 대기」/「차량 배차됨」으로 보여준다. */}
                  <div className="pv2-dmeta">
                    {[o.item, o.vehicle_type].filter(Boolean).join(" · ") || "-"}
                  </div>
                </div>

                {/* 🔴 4번째 알약이 아니라 알약 위의 별도 배지다(사용자 확정 6번) */}
                {issue && (
                  <div className="pv2-dissue">{DISPATCH_ISSUE_STYLE.label}</div>
                )}

                <div className="pv2-dsteps">
                  {DISPATCH_STAGE_LABELS.map((label, i) => {
                    const st = stepStyle(i, stage);
                    return (
                      <div key={label} style={{ display: "contents" }}>
                        <div
                          className="pv2-dstep"
                          style={{ background: st.bg, borderColor: st.bd }}
                        >
                          <span
                            className="pv2-dstep-label"
                            style={{ color: st.color, fontWeight: st.fw }}
                          >
                            {label}
                          </span>
                          <span className="pv2-dstep-sub" style={{ color: st.subColor }}>
                            {subs[i]}
                          </span>
                        </div>
                        {i < 2 && (
                          <span
                            className="pv2-dline"
                            aria-hidden="true"
                            style={{
                              backgroundImage: `radial-gradient(circle at center, ${st.line} 0 1.6px, transparent 1.7px)`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 🔴 시안에 없다는 이유로 혼적 배지·정산방식을 지우지 말 것(원칙 42번).
                    ⚠️ **사진·인수증만 예외로 뺐다** — 사용자 확정 10번(존치)을 PR #107
                    리뷰에서 사용자 본인이 뒤집었다: *"화주에게 인수증 전달은 여기서
                    안 함."* 27차 5라운드가 선착불 입금 계좌를 뒤집은 것과 같은 구조다.
                    🔴 `components/DispatchPhotosPanel.tsx` 와 관리자 업로드·열람은
                    그대로 살아 있다 — 이 화면에서만 안 보여주는 것이다. */}
                <div className="pv2-dfoot">
                  {o.loading_type === "mixable" && <MixableBadge />}
                  {/* 🔴 화주 말이고 축이 둘이다(P1-1, (A)안 확정 2026-08-29).
                      담당자 말 함수(관리자 정산관리·배차가 쓰는 것)를 여기에
                      끌어오지 말 것 — 「주선사 정산」은 담당자의 말이다.
                      ⚠️ 그 함수 이름을 주석에 쓰면 완료조건 grep 에 주석 자신이
                      걸린다(51차 ⑨(a) 와 같은 오탐). */}
                  <span className="pv2-dsettle">
                    {settleLabel && (
                      <>
                        {CUSTOMER_COLLECTION_AXIS_LABEL} {settleLabel}
                        {condition ? ` · ${condition}` : ""}
                      </>
                    )}
                    {cycleLabel && (
                      <>
                        {settleLabel ? " · " : ""}
                        {CUSTOMER_BILLING_AXIS_LABEL} {cycleLabel}
                      </>
                    )}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import MixableBadge from "@/components/MixableBadge";
import Pv2Select from "@/components/pv2/Pv2Select";
import { useListSearchSort } from "@/lib/useListSearchSort";
// 🔴 `DateRangeFilter` 컴포넌트는 관리자 화면 여러 곳이 같이 쓴다 — 모양을 시안에
//    맞추려고 그 컴포넌트를 고치면 관리자가 같이 바뀐다. 계산 함수만 가져다 쓰고
//    칩은 이 화면에서 시안 모양으로 그린다.
import { DatePreset, getDateRange } from "@/components/DateRangeFilter";
import { calcInclusiveAmount } from "@/lib/vat";
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
function priceLabel(n: number | null) {
  if (!n) return "협의 중";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function vatLabel(n: number | null) {
  if (!n) return "담당자 확인 중";
  return `부가세 별도 (부가세 포함 ${calcInclusiveAmount(n).toLocaleString("ko-KR")}원)`;
}

function dateLabel(v: string | null) {
  if (!v) return "";
  return new Date(v).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PERIOD_CHIPS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번주" },
  { value: "month", label: "이번달" },
  { value: "all", label: "전체" },
];

/**
 * 🔴 반려된 발주 요청을 견적 목록에 섞는다(27차, 사용자 확정 2026-08-28).
 *
 * 26차가 「내 요청 내역」을 지우면서 반려 건을 볼 곳이 사라졌다. 승인된 건은 견적으로
 * 전환돼 이 목록에 이미 있지만, 반려된 건은 문자 말고는 확인할 화면이 없었다.
 * 화주는 사이드바 배지만 보고 무엇이 반려됐는지 모른다.
 *
 * 🔴 **승인된 발주 요청은 넣지 않는다** — 이미 견적으로 전환돼 있어 같은 건이 두 번
 *    보인다. `대기중` 도 넣지 않는다(아직 아무 일도 일어나지 않은 것이다).
 * 🔴 **반려 사유(`staff_note`)를 반드시 보여준다** — 사유 없이 "반려"만 뜨면 화주가
 *    다시 문의한다. 그러면 이 화면을 만든 이유가 없어진다.
 */
type Row =
  | { kind: "quote"; id: string; created_at: string; sortAmount: number | null; data: any }
  | { kind: "rejected"; id: string; created_at: string; sortAmount: number | null; data: any };

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "견적일 최신순" },
  { value: "created_at:asc", label: "견적일 오래된순" },
  { value: "final_amount:desc", label: "금액 높은순" },
  { value: "final_amount:asc", label: "금액 낮은순" },
];

export default function CustomerQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<DatePreset>("all");
  // 엑셀 생성 중인 견적 id(버튼 중복 클릭 방지)
  const [excelBusyId, setExcelBusyId] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);

  async function handleExcel(quoteId: string) {
    setExcelBusyId(quoteId);
    setExcelError(null);
    try {
      await downloadQuoteExcel(supabase, quoteId);
    } catch (e: any) {
      setExcelError(e?.message || "견적서 엑셀을 만들지 못했습니다.");
    } finally {
      setExcelBusyId(null);
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
      ...rejected.map((r) => ({
        kind: "rejected" as const,
        id: r.id,
        created_at: r.created_at,
        // 금액이 없는 건이라 금액 정렬에서는 항상 뒤로 간다
        sortAmount: null,
        data: r,
      })),
    ],
    [quotes, rejected]
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
        "id,quote_no,origin,destination,vehicle_type,item,final_amount,status,selected_options,loading_type,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setExcelError(`견적을 불러오지 못했습니다: ${error.message}`);
    setQuotes(data || []);

    // 🔴 반려된 발주 요청만 가져온다 — `승인됨` 은 이미 견적으로 전환돼 위 목록에
    //    있어서 넣으면 같은 건이 두 번 보이고, `대기중` 은 아직 결과가 없다.
    //    ⚠️ 이 표에는 status CHECK 제약이 없다(실측) — 값은 코드가 쓰는 문자열이다.
    const { data: rej, error: rErr } = await supabase
      .from("portal_order_requests")
      .select(
        "id,origin,destination,vehicle_type,body_type,item,notes,staff_note,status,created_at"
      )
      .eq("status", "반려")
      .limit(100);
    if (rErr) setExcelError(`반려된 요청을 불러오지 못했습니다: ${rErr.message}`);
    setRejected(rej || []);

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
      {excelError && (
        <div className="pv2-alert pv2-alert-error" style={{ marginBottom: 14 }}>
          {excelError}
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
            const isRejected = row.kind === "rejected";
            const st = isRejected ? REJECTED_REQUEST_STYLE : quoteStatusStyle(q.status);
            const opts = q.selected_options || {};
            const meta = isRejected
              ? [q.vehicle_type, q.body_type, q.item].filter(Boolean).join(" · ")
              : [q.vehicle_type, opts["차량형태"], opts["왕복/편도"], q.item]
                  .filter(Boolean)
                  .join(" · ");

            return (
              <div key={`${row.kind}-${row.id}`} className="pv2-qcard">
                {/* ⚠️ 배지는 하나만 그린다. 시안 모바일은 배지와 견적번호가 한 줄인데,
                    둘이 서로 다른 부모에 있어 CSS 로는 합칠 수 없다 — 배지를 두 번
                    그리면 원칙 13번(양쪽 관리)의 사고가 난다. 모바일에서는 배지가
                    윗줄에 따로 온다. */}
                <span className="pv2-qstatus" style={{ color: st.color, background: st.bg }}>
                  {st.label}
                </span>
                <div className="pv2-qbody">
                  <div className="pv2-qtop">
                    <span className="pv2-qno">{isRejected ? "발주 요청" : q.quote_no}</span>
                    <span className="pv2-qdate">{dateLabel(row.created_at)}</span>
                    {!isRejected && q.loading_type === "mixable" && <MixableBadge />}
                  </div>
                  <div className="pv2-qroute">
                    {shortAddress(q.origin) || "-"} <span className="pv2-qarrow">→</span>{" "}
                    {shortAddress(q.destination) || "-"}
                  </div>
                  <div className="pv2-qaddr">
                    {q.origin || "-"} → {q.destination || "-"}
                  </div>
                  {meta && <div className="pv2-qmeta">{meta}</div>}
                  {/* 🔴 사유 없이 "반려"만 뜨면 화주가 다시 문의한다 — 이 화면을 만든
                      이유가 없어진다. 담당자가 사유를 안 적었으면 그렇다고 말해준다. */}
                  {isRejected && (
                    <div className="pv2-qreason">
                      {q.staff_note
                        ? `반려 사유 · ${q.staff_note}`
                        : `반려 사유가 기재되지 않았습니다. 고객센터(${COMPANY_SUPPORT_PHONE})로 문의해주세요.`}
                    </div>
                  )}
                  {/* 🔴 「운송 확정」일 때만 — 그 전에는 배차 자체가 없어서 눌러도 빈 화면이다 */}
                  {!isRejected && isQuoteConfirmed(q.status) && (
                    <button
                      type="button"
                      className="pv2-qgo"
                      onClick={() => router.push("/customer/dispatches")}
                    >
                      배차·운송 조회에서 진행 상황 보기 →
                    </button>
                  )}
                </div>
                {/* 🔴 반려 건은 금액 자리를 비운다 — 견적이 나온 적이 없다.
                    견적서 버튼도 없다(내려받을 견적서 자체가 없다). */}
                {!isRejected && (
                  <div className="pv2-qright">
                    <div>
                      <div className="pv2-qprice">{priceLabel(q.final_amount)}</div>
                      <div className="pv2-qvat">{vatLabel(q.final_amount)}</div>
                    </div>
                    <div className="pv2-qacts">
                      <span className="pv2-qdl-wrap">
                        <span className="pv2-qdl-label">견적서</span>
                        <button
                          type="button"
                          className="pv2-qdl"
                          title="PDF 다운로드"
                          aria-label="견적서 PDF 다운로드"
                          onClick={() => window.open(`/customer/quotes/${q.id}/print`, "_blank")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/portal/pdf-icon.svg" alt="" style={{ width: 17, height: 17 }} />
                        </button>
                        {/* 엑셀은 새 탭 없이 그 자리에서 내려받는다. 조회는 로그인 세션으로
                            하므로 RLS 가 본인 회사 견적만 내려준다 — 다른 회사 id 를 넣어도
                            조회 자체가 실패한다. */}
                        <button
                          type="button"
                          className="pv2-qdl"
                          title="엑셀 다운로드"
                          aria-label="견적서 엑셀 다운로드"
                          disabled={excelBusyId === q.id}
                          onClick={() => handleExcel(q.id)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/portal/excel-icon.svg"
                            alt=""
                            style={{ width: 17, height: 17 }}
                          />
                        </button>
                      </span>
                      <Link className="pv2-qopen" href={`/customer/quotes/${q.id}`}>
                        상세 보기
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

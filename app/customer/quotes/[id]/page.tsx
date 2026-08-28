"use client";

// 견적 상세 — 27차 신규 라우트.
//
// 25차까지는 「견적서 출력」이 `print` 를 **새 탭으로 여는 것**뿐이라 포털 안에서
// 견적서를 볼 방법이 없었다. 이 화면이 그 자리다. 인쇄용(`print/`)은 그대로 두고
// 여기서는 포털 셸 안에 견적서 형식으로 그린다.
//
// 🔴 공급자는 `CompanyNameMark` 를 쓴다 — 평문을 그리면 구분선이 슬래시 글자로 찍힌다.
// ⚠️ 시안 공급자는 `위캐리운송(주)` 로 찍혀 있으나 따르지 않는다. 24차 확정값이 정본이다.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import CompanyNameMark from "@/components/CompanyNameMark";
import { COMPANY_BANK_ACCOUNT, hasBankAccount } from "@/lib/companyInfo";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { calcVatAmount, calcInclusiveAmount } from "@/lib/vat";
import { downloadQuoteExcel } from "@/lib/quoteExcel";
import { quoteStatusStyle } from "@/lib/quoteStatusLabels";
import { getQuoteSettlementLine } from "@/lib/settlementLabels";
import MixableBadge from "@/components/MixableBadge";
import Pv2PrintModal from "@/components/pv2/Pv2PrintModal";
import { formatPhoneNumber } from "@/lib/constants";

type QuoteItem = { id: string; item_name: string | null; amount: number | null };

type QuoteDetail = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  base_fare: number | null;
  final_amount: number | null;
  status: string | null;
  loading_type: string | null;
  selected_options: Record<string, any> | null;
  created_at: string;
  companies: { id: string; name: string | null } | null;
};

/** 🔴 금액이 아직 없으면 「협의 중」 — 목록과 같은 규칙이다(시안 실측) */
function money(n: number | null | undefined, fallback = "-") {
  if (n === null || n === undefined) return fallback;
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const META_KEYS = ["차량형태", "물품특성", "운송시간", "왕복/편도", "상차조건", "하차조건"];

export default function CustomerQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [me, setMe] = useState<{ name: string | null; phone: string | null }>({
    name: null,
    phone: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);
  // 🔴 새 탭이 아니라 포털 안 모달이다(27차 리뷰 3라운드)
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // 조회는 로그인 세션으로 한다 — RLS 가 본인 회사 견적만 내려주므로 다른 회사
      // id 를 주소창에 넣어도 조회 자체가 실패한다.
      const { data, error: qErr } = await supabase
        .from("quotes")
        .select(
          "id,quote_no,origin,destination,vehicle_type,item,base_fare,final_amount,status,loading_type,collection_method,billing_cycle,direct_collection_point,selected_options,created_at,companies(id,name)"
        )
        .eq("id", id)
        .single();
      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }
      setQuote(data as any);

      const { data: itemData, error: iErr } = await supabase
        .from("quote_items")
        .select("id,item_name,amount")
        .eq("quote_id", id);
      // 🔴 error 를 삼키지 않는다 — 가산 내역이 조용히 빈 채로 그려지면 금액이 안 맞는다
      if (iErr) setError(`가산 내역을 불러오지 못했습니다: ${iErr.message}`);
      setItems(itemData || []);

      // 수신란의 담당자 — 로그인한 계정 정보다(시안 `담당 …` 줄)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: acct } = await supabase
          .from("customer_accounts")
          .select("name,contact_mobile")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
        if (acct) setMe({ name: acct.name, phone: acct.contact_mobile });
      }
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleExcel() {
    setExcelBusy(true);
    try {
      await downloadQuoteExcel(supabase, id);
    } catch (e: any) {
      setError(e?.message || "견적서 엑셀을 만들지 못했습니다.");
    } finally {
      setExcelBusy(false);
    }
  }

  if (loading) return <div className="pv2-empty">불러오는 중...</div>;

  if (!quote) {
    return (
      <div className="pv2-card-empty">
        <div className="pv2-card-empty-title">견적을 찾을 수 없습니다</div>
        <div className="pv2-card-empty-desc">{error || "삭제되었거나 접근 권한이 없습니다."}</div>
        <Link className="pv2-qopen" href="/customer/quotes" style={{ marginTop: 12 }}>
          견적 목록으로
        </Link>
      </div>
    );
  }

  const st = quoteStatusStyle(quote.status);
  const opts = quote.selected_options || {};
  const meta = [quote.vehicle_type, ...META_KEYS.map((k) => opts[k]), quote.item]
    .filter(Boolean)
    .join(" · ");

  const supply = quote.final_amount;
  // 🔴 금액이 없으면 부가세·총액도 계산하지 않는다 — 0원으로 찍으면 확정 금액처럼 보인다
  const vat = supply ? calcVatAmount(supply) : null;
  const grand = supply ? calcInclusiveAmount(supply) : null;
  // 🔴 네 산출물(이 화면·PDF 2종·엑셀)이 같은 함수로 만든 같은 문구를 쓴다
  const settlementLine = getQuoteSettlementLine(
    (quote as any).collection_method,
    (quote as any).billing_cycle,
    (quote as any).direct_collection_point
  );
  const priceless = !supply;

  return (
    <>
      <div className="pv2-qd-actions">
        <button type="button" className="pv2-qd-back" onClick={() => router.push("/customer/quotes")}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flex: "none" }}
            aria-hidden="true"
          >
            <path d="M20 12H5M11 18l-6-6 6-6" />
          </svg>
          견적 목록으로
        </button>
        <span className="pv2-qd-spacer" />
        <button
          type="button"
          className="pv2-qd-dl"
          onClick={() => setPrintOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal/pdf-icon.svg" alt="" style={{ width: 16, height: 16 }} />
          PDF 다운로드
        </button>
        <button type="button" className="pv2-qd-dl" disabled={excelBusy} onClick={handleExcel}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal/excel-icon.svg" alt="" style={{ width: 16, height: 16 }} />
          엑셀 다운로드
        </button>
      </div>

      {error && (
        <div className="pv2-alert pv2-alert-error" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {printOpen && (
        <Pv2PrintModal
          src={`/customer/quotes/${quote.id}/print`}
          title={`견적서 ${quote.quote_no || ""}`.trim()}
          onClose={() => setPrintOpen(false)}
        />
      )}

      <div className="pv2-qd-doc">
        <div className="pv2-qd-head">
          <div>
            <div className="pv2-qd-title">견 적 서</div>
            <div className="pv2-qd-tagline">발주부터 정산까지, 한 번에 · 위캐리 올캐어</div>
          </div>
          <div className="pv2-qd-headright">
            <span className="pv2-qd-status" style={{ color: st.color, background: st.bg }}>
              {st.label}
            </span>
            <span className="pv2-qd-kv">
              견적번호 <b>{quote.quote_no || "-"}</b>
            </span>
            <span className="pv2-qd-kv">
              견적일자 <b>{formatDate(quote.created_at)}</b>
            </span>
          </div>
        </div>

        <div className="pv2-qd-rule" />

        {/* 🔴 회색 박스가 아니라 위아래 구분선 + padding 20px 0 (시안 실측) */}
        <div className="pv2-qd-parties">
          <div>
            <div className="pv2-qd-party-label">공급자</div>
            <div className="pv2-qd-party-name">
              <CompanyNameMark />
            </div>
            <div className="pv2-qd-party-sub">고객센터 {COMPANY_SUPPORT_PHONE}</div>
          </div>
          <div>
            <div className="pv2-qd-party-label">수신</div>
            <div className="pv2-qd-party-name">{quote.companies?.name || "고객"} 귀중</div>
            <div className="pv2-qd-party-sub">
              {me.name && <>담당 {me.name}</>}
              {me.name && me.phone && <br />}
              {/* 🔴 저장은 숫자만이라 그대로 그리면 01012345678 로 찍힌다(원칙 35번) */}
              {me.phone && formatPhoneNumber(me.phone)}
            </div>
          </div>
        </div>

        {/* ⚠️ 모바일에서도 그린다 — 시안 소스의 모바일 분기에 이 줄이 있다(실측).
            지시서 3-2·완료조건 16은 "모바일에서 뺀다"고 했으나 시안과 어긋난다. */}
        <div className="pv2-qd-lead">아래와 같이 견적합니다.</div>

        <div className="pv2-qd-table">
          <div className="pv2-qd-row">
            <span className="pv2-qd-k">운송 구간</span>
            <span className="pv2-qd-v">
              {quote.origin || "-"}
              <br />
              <span className="pv2-qd-down">↓</span> {quote.destination || "-"}
            </span>
          </div>
          <div className="pv2-qd-row">
            <span className="pv2-qd-k">차량 · 조건</span>
            <span className="pv2-qd-v" style={{ fontWeight: 400 }}>
              {meta || "-"}
              {quote.loading_type === "mixable" && (
                <span style={{ marginLeft: 8, display: "inline-block", verticalAlign: "middle" }}>
                  <MixableBadge />
                </span>
              )}
            </span>
          </div>
          <div className="pv2-qd-row">
            <span className="pv2-qd-k">기본운임</span>
            <span className="pv2-qd-v-right">
              {quote.base_fare ? money(quote.base_fare) : priceless ? "협의 중" : "-"}
            </span>
          </div>
          {items.map((it) => (
            <div key={it.id} className="pv2-qd-row">
              <span className="pv2-qd-k">{it.item_name || "가산"}</span>
              <span className="pv2-qd-v-right">{money(it.amount)}</span>
            </div>
          ))}
          {/* 🔴 「공급가액 (부가세 별도)」 줄 — 견적서 PDF 와 **줄 단위로 같아야 한다**.
              27차 리뷰 전까지 이 줄이 상세에만 없어서, 같은 견적을 PDF 로 받으면
              부가세 별도 금액이 보이고 화면에서는 안 보였다(31차 "쌍으로 움직인다"와
              같은 결의 어긋남이다). 🔴 print 2종을 고치면 이 줄도 같이 볼 것. */}
          <div className="pv2-qd-row pv2-qd-row-sub">
            <span className="pv2-qd-k">공급가액 (부가세 별도)</span>
            <span className="pv2-qd-v-right">{priceless ? "협의 중" : money(supply)}</span>
          </div>
          <div className="pv2-qd-row">
            <span className="pv2-qd-k">부가세 (10%)</span>
            <span className="pv2-qd-v-right">{vat === null ? "-" : money(vat)}</span>
          </div>
        </div>

        <div className="pv2-qd-total">
          <span className="pv2-qd-total-label">
            총 견적금액 <span>(부가세 포함)</span>
          </span>
          <span className="pv2-qd-total-amount">{grand === null ? "협의 중" : money(grand)}</span>
        </div>

        {/* 🔴 정산방식 (27차 리뷰 4라운드) — 합계와 입금 계좌 **사이**가 자리다.
            🔴 문구는 `getQuoteSettlementLine()` 한 곳에서 만든다 — 이 화면과 PDF 2종·
               엑셀이 각자 조합하면 조용히 어긋난다(31차 쌍 규칙, 위 「공급가액」 줄과 같은 결).
            🔴 값이 없으면 블록 자체를 그리지 않는다(입금 계좌와 같은 규칙). */}
        {settlementLine && (
          <div className="pv2-qd-settle">
            <div className="pv2-qd-bank-label">정산방식</div>
            <div className="pv2-qd-settle-v">{settlementLine}</div>
          </div>
        )}

        {/* 🔴 값이 비면 블록 자체를 그리지 않는다 — 위 100px 여백만 남으면 규격이 무너진다 */}
        {hasBankAccount() && (
          <div className="pv2-qd-bank">
            <div style={{ flex: "none" }}>
              <div className="pv2-qd-bank-label">입금 계좌</div>
              <div className="pv2-qd-bank-no">
                {COMPANY_BANK_ACCOUNT.bank} {COMPANY_BANK_ACCOUNT.number}
              </div>
              <div className="pv2-qd-bank-holder">예금주 {COMPANY_BANK_ACCOUNT.holder}</div>
            </div>
            <div className="pv2-qd-bank-ask">문의 {COMPANY_SUPPORT_PHONE}</div>
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { COMPANY_INFO, COMPANY_BANK_ACCOUNT, hasBankAccount } from "@/lib/companyInfo";
import { calcVatAmount, calcInclusiveAmount } from "@/lib/vat";
import { getQuoteSettlementLine, CUSTOMER_COLLECTION_AXIS_LABEL } from "@/lib/settlementLabels";
import CompanyNameMark from "@/components/CompanyNameMark";

type QuoteItem = { id: string; item_name: string | null; amount: number | null };

type QuoteDetail = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  distance_km: number | null;
  vehicle_type: string | null;
  item: string | null;
  base_fare: number | null;
  discount_amount: number | null;
  final_amount: number | null;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  selected_options: Record<string, any> | null;
  loading_type: string | null;
  mixed_shipper_consent: boolean | null;
  mixed_discount_type: string | null;
  mixed_discount_amount: number | null;
  mixed_discount_percent: number | null;
  notes: string | null;
  requested_pickup_at: string | null;
  requested_dropoff_at: string | null;
  companies: { id: string; name: string; phone: string | null; address: string | null } | null;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(v: string | null) {
  if (!v) return null;
  return new Date(v).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function QuotePrintPage() {
  const params = useParams();
  const id = params?.id as string;
  // 🔴 화주포털 모달(`Pv2PrintModal`)이 쓰는 값과 **같게 둔다** — 견적서 print 2종은
  //    항상 쌍으로 움직인다(31차). 관리자 화면에는 아직 그 모달이 없지만, 한쪽에만
  //    분기를 두면 다음에 붙일 때 어긋난다.
  const embedded = useSearchParams().get("embed") === "1";

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*, companies(id,name,phone,address)")
        .eq("id", id)
        .single();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setQuote(data as any);

      const { data: itemData } = await supabase
        .from("quote_items")
        .select("id,item_name,amount")
        .eq("quote_id", id);
      setItems(itemData || []);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">불러오는 중...</div>
      </main>
    );
  }

  if (error || !quote) {
    return (
      <main className="container">
        <div className="error-box">견적 정보를 불러오지 못했습니다. {error}</div>
      </main>
    );
  }

  const recipientName = quote.companies?.name || quote.guest_name || "고객";
  const recipientPhone = quote.companies?.phone || quote.guest_phone || "";

  const validUntil = new Date(quote.created_at);
  validUntil.setDate(validUntil.getDate() + 7);

  // 🔴 네 산출물(견적서 상세·PDF 2종·엑셀)이 같은 함수로 만든 같은 문구를 쓴다
  /** 🔴 선착불이면 입금 계좌를 그리지 않는다(5라운드 확정) */
  const isDriverDirect = (quote as any).collection_method === "driver_direct";
  const settlementLine = getQuoteSettlementLine(
    (quote as any).collection_method,
    (quote as any).billing_cycle,
    (quote as any).direct_collection_point
  );

  const optionEntries = quote.selected_options
    ? Object.entries(quote.selected_options).filter(
        ([, v]) => v !== null && v !== undefined && v !== "" && v !== 0 && v !== false
      )
    : [];

  return (
    <main className="container">
      <div
        className="print-hide"
        style={{
          display: embedded ? "none" : "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          아래 버튼을 누르면 인쇄창이 열립니다. 그 화면에서 "프린터" 대신
          "PDF로 저장"을 선택하면 다운로드됩니다.
        </span>
        <button className="btn" onClick={() => window.print()}>
          인쇄 / PDF로 저장
        </button>
      </div>

      <div className="print-sheet">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, margin: 0, letterSpacing: "-0.02em" }}>
              견적서
            </h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
              견적번호 {quote.quote_no}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, lineHeight: 1.6, color: "#333" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}><CompanyNameMark /></div>
            <div>
              대표 {COMPANY_INFO.ceo} · 사업자등록번호 {COMPANY_INFO.bizRegNo}
            </div>
            <div>{COMPANY_INFO.address}</div>
            <div>
              TEL {COMPANY_INFO.phone}
              {COMPANY_INFO.email ? ` · ${COMPANY_INFO.email}` : ""}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 28,
            paddingBottom: 20,
            borderBottom: "1px solid #ddd",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, color: "#888", marginBottom: 4 }}>수신</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{recipientName} 귀하</div>
            {recipientPhone && (
              <div style={{ fontSize: 12.5, color: "#555", marginTop: 2 }}>
                {recipientPhone}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "#888", marginBottom: 4 }}>
              발행일 / 유효기간
            </div>
            <div style={{ fontSize: 13 }}>{formatDate(quote.created_at)} 발행</div>
            <div style={{ fontSize: 12.5, color: "#555", marginTop: 2 }}>
              {formatDate(validUntil.toISOString())}까지 유효
            </div>
          </div>
        </div>

        <table style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>구간</th>
              <th>거리</th>
              <th>톤수</th>
              <th>품목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {quote.origin || "-"} → {quote.destination || "-"}
              </td>
              <td>{quote.distance_km ? `${quote.distance_km}km` : "-"}</td>
              <td>{quote.vehicle_type || "-"}</td>
              <td>{quote.item || "-"}</td>
            </tr>
          </tbody>
        </table>

        {(formatDateTime(quote.requested_pickup_at) || formatDateTime(quote.requested_dropoff_at)) && (
          <p style={{ fontSize: 12.5, color: "#555", marginTop: 0, marginBottom: 12 }}>
            {formatDateTime(quote.requested_pickup_at) && (
              <>희망 상차: {formatDateTime(quote.requested_pickup_at)}</>
            )}
            {formatDateTime(quote.requested_pickup_at) && formatDateTime(quote.requested_dropoff_at) && "  ·  "}
            {formatDateTime(quote.requested_dropoff_at) && (
              <>희망 하차: {formatDateTime(quote.requested_dropoff_at)}</>
            )}
          </p>
        )}

        {optionEntries.length > 0 && (
          <p style={{ fontSize: 12, color: "#777", marginTop: 0, marginBottom: quote.loading_type === "mixable" && quote.mixed_shipper_consent ? 8 : 24 }}>
            {optionEntries
              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v === true ? "적용" : v}`)
              .join("  ·  ")}
          </p>
        )}

        {quote.loading_type === "mixable" && quote.mixed_shipper_consent && (
          <p style={{ fontSize: 12, color: "#C2410C", fontWeight: 700, marginTop: 0, marginBottom: 24 }}>
            🔀 혼적가능 화물 (할인 반영된 운임입니다)
          </p>
        )}

        <table>
          <thead>
            <tr>
              <th>항목</th>
              <th style={{ textAlign: "right" }}>금액</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>기본운임</td>
              <td className="num" style={{ textAlign: "right" }}>
                {won(quote.base_fare)}
              </td>
            </tr>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.item_name}</td>
                <td className="num" style={{ textAlign: "right" }}>
                  {won(it.amount)}
                </td>
              </tr>
            ))}
            {!!quote.discount_amount && (
              <tr>
                <td>할인</td>
                <td className="num" style={{ textAlign: "right" }}>
                  -{won(quote.discount_amount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 🔴 부가세 행 — 27차에 넣었다. 그전까지 PDF 에는 「합계 (VAT 별도)」 한 줄뿐이라
            같은 견적을 엑셀로 받으면 부가세가 나오고 PDF 로 받으면 안 나왔다.
            31차가 금지한 상태("두 산출물은 쌍으로 움직인다")가 이미 발생해 있었다.
            🔴 `lib/quoteExcel.ts` 는 이미 맞으니 건드리지 말 것. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "10px 0",
            borderTop: "1px solid #e5e8eb",
            marginTop: 8,
          }}
        >
          {/* 🔴 「(부가세 별도)」는 합계의 「(부가세 포함)」과 같이 회색이고, 라벨은
              한 줄로 고정한다. 금액은 다른 행보다 크고 굵되 **총 견적금액(22px)보다는
              작다**(5라운드 확정). 🔴 화주 print·화면 상세와 같은 위계다 — 한쪽만 고치지 말 것. */}
          <span style={{ fontSize: 13.5, color: "#191f28", fontWeight: 700, whiteSpace: "nowrap" }}>
            공급가액 <span style={{ fontWeight: 500, color: "#888" }}>(부가세 별도)</span>
          </span>
          <span className="num" style={{ fontSize: 17, fontWeight: 800 }}>
            {won(quote.final_amount)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "10px 0",
          }}
        >
          <span style={{ fontSize: 13.5, color: "#555" }}>부가세 (10%)</span>
          <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>
            {quote.final_amount === null || quote.final_amount === undefined
              ? "-"
              : won(calcVatAmount(quote.final_amount))}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "16px 0",
            borderTop: "2px solid #191f28",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            총 견적금액 <span style={{ fontWeight: 500, color: "#888" }}>(부가세 포함)</span>
          </span>
          <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>
            {quote.final_amount === null || quote.final_amount === undefined
              ? "-"
              : won(calcInclusiveAmount(quote.final_amount))}
          </span>
        </div>

        {/* 🔴 정산방식 (27차 리뷰 4라운드) — 「이 금액을 어떻게 정산하는가」라
            합계와 입금 계좌 **사이**가 자리다.
            🔴 문구는 `getQuoteSettlementLine()` 한 곳에서 만든다 — 견적서 상세·
               PDF 2종·엑셀 네 곳이 각자 조합하면 조용히 어긋난다(31차 쌍 규칙).
            🔴 값이 없으면 블록 자체를 그리지 않는다(입금 계좌와 같은 규칙) —
               빈 라벨만 남으면 규격이 무너진다. */}
        {settlementLine && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#888",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              {CUSTOMER_COLLECTION_AXIS_LABEL}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{settlementLine}</div>
          </div>
        )}

        {/* 🔴 값이 비면 블록 자체가 안 나온다 — 위 여백만 남으면 규격이 무너진다.
            🔴 **선착불이면 그리지 않는다**(5라운드 확정) — 화주가 차주에게 직접 지급하므로
               입금할 계좌가 없다. 4라운드에 남겨뒀던 것을 확답 받고 없앤 것이니 되돌리지 말 것.
            시안은 합계 아래 100px 여백 뒤에 이 블록을 놓는데, 여기는 A4 인쇄물이라
            같은 비율로 두면 특이사항·안내 문구가 다음 장으로 밀린다. 인쇄 문서
            크기에 맞춰 40px 로 뒀다(화면 상세는 시안대로 100px 이다). */}
        {hasBankAccount() && !isDriverDirect && (
          <div style={{ marginTop: 40 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#888",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              입금 계좌
            </div>
            <div className="num" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>
              {COMPANY_BANK_ACCOUNT.bank} {COMPANY_BANK_ACCOUNT.number}
            </div>
            <div style={{ fontSize: 12.5, color: "#555", marginTop: 2 }}>
              예금주 {COMPANY_BANK_ACCOUNT.holder}
            </div>
          </div>
        )}

        {quote.notes && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11.5, color: "#888", marginBottom: 4 }}>특이사항</div>
            <p style={{ fontSize: 12.5, color: "#333", margin: 0, whiteSpace: "pre-wrap" }}>
              {quote.notes}
            </p>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: "#999", marginTop: 32, lineHeight: 1.6 }}>
          · 본 견적서는 상기 조건 기준이며, 실제 상하차 조건 및 대기시간에 따라 금액이
          변동될 수 있습니다.
          <br />
          · 상단 금액은 공급가액이며, 총 견적금액은 부가세를 포함한 금액입니다. 세금계산서는 정산 시 발행됩니다.
        </p>
      </div>
    </main>
  );
}

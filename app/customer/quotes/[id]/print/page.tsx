"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import { COMPANY_INFO } from "@/lib/companyInfo";

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
  notes: string | null;
  requested_pickup_at: string | null;
  requested_dropoff_at: string | null;
  selected_options: Record<string, any> | null;
  companies: { id: string; name: string; phone: string | null; address: string | null } | null;
};

function won(n: number | null) {
  if (n === null || n === undefined) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(v: string | null) {
  if (!v) return null;
  return new Date(v).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CustomerQuotePrintPage() {
  const params = useParams();
  const id = params?.id as string;

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
      <div className="portal-theme">
        <main className="container">
          <div className="empty-state">불러오는 중...</div>
        </main>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="portal-theme">
        <main className="container">
          <div className="error-box">
            견적 정보를 불러오지 못했습니다. 본인 회사의 견적만 조회할 수 있습니다.
          </div>
        </main>
      </div>
    );
  }

  const recipientName = quote.companies?.name || "고객";
  const recipientPhone = quote.companies?.phone || "";

  const validUntil = new Date(quote.created_at);
  validUntil.setDate(validUntil.getDate() + 7);

  const optionEntries = quote.selected_options
    ? Object.entries(quote.selected_options).filter(
        ([, v]) => v !== null && v !== undefined && v !== "" && v !== 0 && v !== false
      )
    : [];

  return (
    <div className="portal-theme">
      <main className="container">
        <div
          className="print-hide"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            아래 버튼을 누르면 인쇄창이 열립니다. "PDF로 저장"을 선택하면 다운로드됩니다.
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
              <h1 style={{ fontSize: 28, margin: 0, letterSpacing: "-0.02em" }}>견적서</h1>
              <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>견적번호 {quote.quote_no}</p>
            </div>
            <div style={{ textAlign: "right", fontSize: 12.5, lineHeight: 1.6, color: "#333" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{COMPANY_INFO.name}</div>
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
                <div style={{ fontSize: 12.5, color: "#555", marginTop: 2 }}>{recipientPhone}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "#888", marginBottom: 4 }}>발행일 / 유효기간</div>
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
              {formatDateTime(quote.requested_pickup_at) && <>희망 상차: {formatDateTime(quote.requested_pickup_at)}</>}
              {formatDateTime(quote.requested_pickup_at) && formatDateTime(quote.requested_dropoff_at) && "  ·  "}
              {formatDateTime(quote.requested_dropoff_at) && <>희망 하차: {formatDateTime(quote.requested_dropoff_at)}</>}
            </p>
          )}

          {optionEntries.length > 0 && (
            <p style={{ fontSize: 12, color: "#777", marginTop: 0, marginBottom: 24 }}>
              {optionEntries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v === true ? "적용" : v}`).join("  ·  ")}
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "16px 0",
              borderTop: "2px solid #191f28",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>합계 (VAT 별도)</span>
            <span className="num" style={{ fontSize: 22, fontWeight: 800 }}>
              {won(quote.final_amount)}
            </span>
          </div>

          {COMPANY_INFO.bankAccount && (
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>입금계좌: {COMPANY_INFO.bankAccount}</p>
          )}

          {quote.notes && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11.5, color: "#888", marginBottom: 4 }}>특이사항</div>
              <p style={{ fontSize: 12.5, color: "#333", margin: 0, whiteSpace: "pre-wrap" }}>{quote.notes}</p>
            </div>
          )}

          <p style={{ fontSize: 11.5, color: "#999", marginTop: 32, lineHeight: 1.6 }}>
            · 본 견적서는 상기 조건 기준이며, 실제 상하차 조건 및 대기시간에 따라 금액이 변동될 수 있습니다.
            <br />
            · 부가가치세(VAT)는 별도이며, 세금계산서는 정산 시 발행됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}

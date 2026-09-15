"use client";

import { useState } from "react";
import PublicPageHeader from "@/components/PublicPageHeader";
import CompanyNameMark from "@/components/CompanyNameMark";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { COMPANY_BANK_ACCOUNT, hasBankAccount } from "@/lib/companyInfo";
import { calcVatAmount } from "@/lib/vat";
import { getQuoteSettlementLine } from "@/lib/settlementLabels";
import {
  calcQuoteAdjustment,
  shouldShowAdjustment,
  formatAdjustment,
  QUOTE_ADJUSTMENT_LABEL,
} from "@/lib/quoteAdjustment";
import { QUOTE_VALID_DAYS } from "@/lib/quoteShare";

// 로그인 없이 여는 견적서 (2026-09-15 · 사용자 지시).
//
// 사용자 확정 3건: ① 연락처 뒤 4자리를 한 번 더 묻는다 ② 유효기간이 지나면 막는다
//                  ③ 기존 견적안내 문자를 이 링크 문자로 대체한다
//
// 🔴 **주소만으로는 아무것도 안 보인다.** 이 화면은 처음에 입력칸 하나만 그리고,
//    서버가 뒤 4자리를 확인해 준 뒤에야 견적 내용을 **처음 받아온다**(미리 받아서
//    숨기는 것이 아니다 — 숨긴 값은 페이지 소스에 그대로 남는다. `ObfuscatedEmail`
//    에서 겪은 것과 같은 함정이다).
// 🔴 **서버 컴포넌트로 바꾸지 말 것** — 토큰이 주소에 있으므로 서버에서 바로 읽어
//    렌더링하면 뒤 4자리 확인이 통째로 무의미해진다.
//
// 🔴 **판단(유효기간·뒤 4자리)을 여기서 하지 말 것** — 전부 서버(`app/api/public/
//    quote-share`)가 하고 화면은 결과만 그린다. 화면에서 판단하면 개발자도구로 넘긴다.
//
// 🔴 **금액 계산을 여기에 다시 적지 말 것** — 부가세·정산문구·「조정」 줄을 견적서
//    네 산출물과 **같은 함수**로 만든다. 따로 적으면 화주가 받은 PDF 와 이 화면의
//    숫자가 갈린다(원칙 42번).

type ShareQuote = any;
type ShareItem = { id: string; item_name: string | null; amount: number | null };

function won(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

function formatDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(v)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QuoteSharePage({ params }: { params: { token: string } }) {
  const [last4, setLast4] = useState("");
  const [quote, setQuote] = useState<ShareQuote | null>(null);
  const [items, setItems] = useState<ShareItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // 🔴 **POST 다** — GET 이면 토큰과 뒤 4자리가 주소창·서버 로그·리퍼러에 남는다.
      const res = await fetch("/api/public/quote-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, last4 }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "견적서를 불러오지 못했습니다.");
        return;
      }
      setQuote(data.quote);
      setItems(data.items || []);
    } catch {
      setError("견적서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  // ── 확인 전 화면 ───────────────────────────────────────────────────────────
  if (!quote) {
    return (
      <div className="portal-theme">
        <PublicPageHeader />
        <main className="container" style={{ maxWidth: 420, padding: "48px 20px 64px" }}>
          <h1 style={{ fontSize: 21, marginBottom: 8 }}>견적서 확인</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
            본인 확인을 위해 <strong>견적서를 받으신 연락처 뒤 4자리</strong>를
            입력해주세요.
          </p>
          <form onSubmit={handleVerify}>
            <div className="field">
              <label htmlFor="last4">연락처 뒤 4자리</label>
              <input
                id="last4"
                /* 🔴 `type="number"` 를 쓰지 말 것 — 앞자리 0 이 사라지고 화살표가 붙는다.
                   `inputMode="numeric"` 이 모바일 숫자 자판을 띄운다. */
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                style={{ fontSize: 16, letterSpacing: 4, textAlign: "center" }}
              />
            </div>
            {error && (
              <div className="error-box" style={{ marginTop: 14 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn"
              disabled={last4.length !== 4 || loading}
              style={{ width: "100%", marginTop: 16, padding: "12px 0", fontSize: 15 }}
            >
              {loading ? "확인 중…" : "견적서 보기"}
            </button>
          </form>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 20, lineHeight: 1.6 }}>
            견적 유효기간은 발행일로부터 {QUOTE_VALID_DAYS}일입니다.
            <br />
            문의 <a href={`tel:${COMPANY_SUPPORT_PHONE}`}>{COMPANY_SUPPORT_PHONE}</a>
          </p>
        </main>
      </div>
    );
  }

  // ── 견적서 ─────────────────────────────────────────────────────────────────
  const validUntil = new Date(quote.created_at);
  validUntil.setDate(validUntil.getDate() + QUOTE_VALID_DAYS);

  /** 🔴 선착불이면 입금 계좌를 그리지 않는다(27차 5라운드 확정 — 화주가 차주에게
   *  직접 지급하는 건에 입금할 계좌를 적으면 잘못된 문서다). */
  const isDriverDirect = quote.collection_method === "driver_direct";
  const settlementLine = getQuoteSettlementLine(
    quote.collection_method,
    quote.billing_cycle,
    quote.direct_collection_point
  );

  // 🔴 items 를 받은 **뒤에** 계산한다 — 빈 배열이면 가산액이 통째로 「조정」으로 보인다.
  const quoteAdjustment = calcQuoteAdjustment(quote, items);

  const optionEntries = quote.selected_options
    ? Object.entries(quote.selected_options).filter(
        ([, v]) => v !== null && v !== undefined && v !== "" && v !== 0 && v !== false
      )
    : [];

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", gap: 10, padding: "7px 0", fontSize: 13.5 }}>
      <span style={{ width: 92, flexShrink: 0, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );

  return (
    <div className="portal-theme">
      <PublicPageHeader />
      <main className="container" style={{ maxWidth: 680, padding: "32px 20px 64px" }}>
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <h1 style={{ fontSize: 20, margin: 0 }}>견적서</h1>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              {quote.quote_no || ""}
            </span>
          </div>

          <Row label="수신" value={quote.company_name || quote.guest_name || "고객"} />
          <Row
            label="발행일 / 유효기간"
            value={`${formatDate(quote.created_at)} · ${formatDate(
              validUntil.toISOString()
            )}까지 유효`}
          />

          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />

          <Row label="출발지" value={quote.origin || "-"} />
          <Row label="도착지" value={quote.destination || "-"} />
          {!!quote.distance_km && <Row label="거리" value={`${quote.distance_km}km`} />}
          <Row label="상차 일시" value={formatDateTime(quote.requested_pickup_at)} />
          <Row label="하차 일시" value={formatDateTime(quote.requested_dropoff_at)} />
          <Row label="차량" value={[quote.vehicle_type, quote.body_type].filter(Boolean).join(" · ") || "-"} />
          {quote.item && <Row label="품목" value={quote.item} />}

          {optionEntries.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.7 }}>
              {optionEntries
                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v === true ? "적용" : v}`)
                .join("  ·  ")}
            </p>
          )}

          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />

          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>항목</th>
                <th style={{ textAlign: "right" }}>금액</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>기본운임</td>
                <td style={{ textAlign: "right" }}>{won(quote.base_fare)}</td>
              </tr>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.item_name}</td>
                  <td style={{ textAlign: "right" }}>{won(it.amount)}</td>
                </tr>
              ))}
              {!!quote.discount_amount && (
                <tr>
                  <td>할인</td>
                  <td style={{ textAlign: "right" }}>-{won(quote.discount_amount)}</td>
                </tr>
              )}
              {/* 🔴 「조정」 — 견적서 다섯 산출물과 **같은 함수**가 만든다(36차 E장).
                  0이면 그리지 않는다. */}
              {shouldShowAdjustment(quoteAdjustment) && (
                <tr>
                  <td>{QUOTE_ADJUSTMENT_LABEL}</td>
                  <td style={{ textAlign: "right" }}>
                    {formatAdjustment(quoteAdjustment, (n) => won(n) || "")}
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
              padding: "10px 0",
              borderTop: "1px solid var(--border)",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
              공급가액 <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>(부가세 별도)</span>
            </span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{won(quote.final_amount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>부가세 (10%)</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
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
              padding: "12px 0",
              borderTop: "2px solid var(--text)",
            }}
          >
            <span style={{ fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap" }}>
              총 견적금액{" "}
              <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>(부가세 포함)</span>
            </span>
            <span style={{ fontSize: 22, fontWeight: 800 }}>
              {quote.final_amount === null || quote.final_amount === undefined
                ? "-"
                : won(quote.final_amount + calcVatAmount(quote.final_amount))}
            </span>
          </div>

          {/* 🔴 문구는 `getQuoteSettlementLine()` 한 곳에서 만든다 — 견적서 상세·
              PDF 2종·엑셀과 같은 말이어야 한다. 값이 없으면 그리지 않는다. */}
          {settlementLine && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
              {settlementLine}
            </p>
          )}

          {/* 🔴 선착불이면 계좌를 그리지 않는다(위 주석) · 값이 비면 블록 자체가 없다 */}
          {!isDriverDirect && hasBankAccount() && (
            <p style={{ fontSize: 12.5, marginTop: 10 }}>
              입금 계좌 · {COMPANY_BANK_ACCOUNT.bank} {COMPANY_BANK_ACCOUNT.number} (
              {COMPANY_BANK_ACCOUNT.holder})
            </p>
          )}

          {quote.notes && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 14, whiteSpace: "pre-wrap" }}>
              {quote.notes}
            </p>
          )}

          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 20, lineHeight: 1.7 }}>
            · 현장 조건이 견적과 다를 경우 추가비가 발생할 수 있으며, 사유와 금액을
            안내드린 후 청구합니다.
            <br />
            · 상단 금액은 공급가액이며, 총 견적금액은 부가세를 포함한 금액입니다.
            세금계산서는 정산 시 발행됩니다.
          </p>

          <div
            style={{
              marginTop: 22,
              paddingTop: 14,
              borderTop: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <CompanyNameMark />
            <div style={{ marginTop: 4 }}>
              문의 <a href={`tel:${COMPANY_SUPPORT_PHONE}`}>{COMPANY_SUPPORT_PHONE}</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

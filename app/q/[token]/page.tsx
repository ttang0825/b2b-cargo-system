"use client";

import { useEffect, useState } from "react";
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
import { buildQuoteFareLines, QUOTE_SURCHARGE_LINE_LABEL } from "@/lib/quoteFareLines";
// 🔴 **`lib/quoteShare.ts` 에서 가져오지 말 것** — 그 파일은 `crypto` 를 쓰고
//    이 화면은 클라이언트 컴포넌트다(번들러가 노드 모듈을 끌어온다).
import { QUOTE_VALID_DAYS } from "@/lib/quoteValidity";

// 로그인 없이 여는 견적서 (2026-09-15 · 사용자 지시).
//
// ⚠️ **연락처 뒤 4자리 확인은 같은 날 사용자 지시로 없앴다**
//    (*"뒤4자리 확인을 빼고 바로 링크를 확인할수 있으면 좋겠다"*).
//    🔴 그래서 지금은 **링크를 열면 바로 견적서가 뜬다** — 링크를 아는 사람이 곧
//    열람 권한자이고, 토큰의 추측 불가능성이 **유일한 방어선**이다.
//    🔴 **입력칸을 말없이 되살리지 말 것** — 되살리려면 사용자에게 먼저 물어야 한다.
//
// 🟢 남은 확정 둘: ① **유효기간이 지나면 막는다** ② 기존 견적안내 문자를 이 링크로 대체.
//
// 🔴 **서버 컴포넌트로 바꾸지 말 것.** 4자리 확인이 없어진 뒤에도 그대로인 이유가 있다 —
//    지금은 **주소를 여는 것만으로는 HTML 에 견적 내용이 실리지 않는다.** 화면이 뜬 뒤
//    브라우저가 따로 받아오기 때문이고, 그래서 **링크 미리보기 봇·크롤러가 받아 가지
//    못한다.** 서버에서 바로 렌더링하면 그 성질이 통째로 사라진다.
//
// 🔴 **판단(유효기간)을 여기서 하지 말 것** — 서버(`app/api/public/quote-share`)가
//    하고 화면은 결과만 그린다. 화면에서 판단하면 개발자도구로 넘긴다.
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
  const [quote, setQuote] = useState<ShareQuote | null>(null);
  const [items, setItems] = useState<ShareItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔴 **화면이 뜨면 바로 받아온다** — 확인 단계가 없어졌으므로 화주가 누를 것이 없다.
  //    🔴 서버 컴포넌트로 옮기지 말 것(위 주석 — HTML 에 내용이 안 실리는 성질을 잃는다).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 🔴 **POST 다** — 토큰이 서버 로그·리퍼러에 덜 남는다.
        const res = await fetch("/api/public/quote-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setError(data.error || "견적서를 불러오지 못했습니다.");
          return;
        }
        setQuote(data.quote);
        setItems(data.items || []);
      } catch {
        if (alive) setError("견적서를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // 🔴 화면을 떠난 뒤 setState 하지 않도록 잠근다(경고가 콘솔에 남는다)
    return () => {
      alive = false;
    };
  }, [params.token]);

  // ── 불러오는 중 · 실패 ─────────────────────────────────────────────────────
  if (loading || !quote) {
    return (
      <div className="portal-theme">
        <PublicPageHeader />
        <main className="container" style={{ maxWidth: 420, padding: "56px 20px 64px" }}>
          {loading ? (
            <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>
              견적서를 불러오는 중입니다…
            </p>
          ) : (
            <>
              <h1 style={{ fontSize: 19, marginBottom: 10 }}>견적서를 열 수 없습니다</h1>
              {/* 🔴 사유를 가르지 않는다 — 없는 토큰인지 기간이 지난 것인지는
                  서버가 정한 문구 그대로만 보여준다. */}
              <div className="error-box">{error}</div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--text-muted)",
                  marginTop: 18,
                  lineHeight: 1.7,
                }}
              >
                견적 유효기간은 발행일로부터 {QUOTE_VALID_DAYS}일입니다.
                <br />
                문의 <a href={`tel:${COMPANY_SUPPORT_PHONE}`}>{COMPANY_SUPPORT_PHONE}</a>
              </p>
            </>
          )}
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
  // 🔴 **가산은 한 줄로 합쳐 그린다**(v12 C장 (가)안 · `lib/quoteFareLines.ts`).
  //    할인(음수) 줄과 조정 줄은 그대로 남는다 — 사유는 그 파일 머리말.
  const fare = buildQuoteFareLines(quote, items);
  const quoteAdjustment = fare.adjustment;

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
          {/* 🔴 `quotes` 에 `body_type` 컬럼은 없다 — 차량형태는 `selected_options` 안의
              한글 키이고 아래 옵션 줄에 이미 나온다. 견적서 print 2종도 이 자리에는
              `vehicle_type` 하나만 찍는다(같은 문서라 모양이 갈리면 안 된다). */}
          <Row label="차량" value={quote.vehicle_type || "-"} />
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
              {fare.surcharge !== 0 && (
                <tr>
                  <td>{QUOTE_SURCHARGE_LINE_LABEL}</td>
                  <td style={{ textAlign: "right" }}>{won(fare.surcharge)}</td>
                </tr>
              )}
              {fare.discountLines.map((it, di) => (
                <tr key={`d${di}`}>
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

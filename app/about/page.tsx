import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";
import {
  COMPANY_ADDRESS,
  COMPANY_BIZ_REG_NO,
  COMPANY_CEO,
  COMPANY_ECOMMERCE_LICENSE,
  COMPANY_FREIGHT_BROKER_LICENSE,
  COMPANY_GREETING_CLOSING_PARAGRAPHS,
  COMPANY_GREETING_PARAGRAPHS,
  COMPANY_GREETING_PRINCIPLES,
  COMPANY_GREETING_SIGNATURE,
  COMPANY_LEGAL_NAME,
  COMPANY_SERVICE_NAME,
} from "@/lib/companyInfo";

// 회사소개. 신생사라 실적으로 신뢰를 주기 어려우므로 "실재하는 허가 업체"임을 보여주는 것이 목적.
// **의도적으로 넣지 않은 것**: 설립 연도·연혁(신생사라 오히려 역효과), 지도(외부 지도 API를
// 붙이면 키 발급·비용·개인정보처리방침 위탁 조항까지 영향이 번짐 — 주소 텍스트만 표기).
// ⚠️ **보험 항목을 다시 넣지 말 것**(34차). 현재 증권이 이사화물 특별약관이라 일반화물
// 담보 여부가 확인되지 않았고, "가입" 사실만 적어도 고객은 일반화물도 보상된다고 읽는다.
// 담보 범위가 정리되어도 다시 넣을지는 별도 판단 사항.

const OVERVIEW: [string, string][] = [
  ["상호", COMPANY_LEGAL_NAME],
  ["대표자", COMPANY_CEO],
  ["서비스명", COMPANY_SERVICE_NAME],
  ["사업 영역", "화물자동차 운송주선업 (화물 배차·운송 주선)"],
  ["소재지", COMPANY_ADDRESS],
];

const CREDENTIALS: [string, string][] = [
  ["화물자동차 운송주선사업 허가", COMPANY_FREIGHT_BROKER_LICENSE],
  ["통신판매업 신고", COMPANY_ECOMMERCE_LICENSE],
  ["사업자등록번호", COMPANY_BIZ_REG_NO],
];

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map(([label, value]) => (
        <div key={label} className="about-info-row">
          <div className="about-info-label">{label}</div>
          <div className="about-info-value">{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="portal-theme">
      <LandingHeader />

      <main className="container" style={{ maxWidth: 760, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">회사소개</h1>
            <p className="page-desc">화물 운송이 필요한 곳과 차량을 연결합니다.</p>
          </div>
        </div>

        {/* 1. 인사말 — 본문은 lib/companyInfo.ts에 모아둠(임시안이라 이후 교체 예정) */}
        <section className="card" style={{ padding: 28, marginBottom: 20 }}>
          {COMPANY_GREETING_PARAGRAPHS.map((p) => (
            <p key={p} className="about-greeting-p">
              {p}
            </p>
          ))}

          <div style={{ margin: "18px 0" }}>
            {COMPANY_GREETING_PRINCIPLES.map((pr) => (
              <div key={pr.title} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>{pr.title}</div>
                <p className="about-greeting-p" style={{ margin: 0 }}>
                  {pr.body}
                </p>
              </div>
            ))}
          </div>

          {COMPANY_GREETING_CLOSING_PARAGRAPHS.map((p) => (
            <p key={p} className="about-greeting-p">
              {p}
            </p>
          ))}

          {/* 서명은 본문과 시각적으로 구분 */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid var(--border)",
              textAlign: "right",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {COMPANY_GREETING_SIGNATURE}
          </div>
        </section>

        {/* 2. 회사 개요 */}
        <section className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 className="about-section-title">회사 개요</h2>
          <InfoTable rows={OVERVIEW} />
        </section>

        {/* 3. 보유 자격 */}
        <section className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 className="about-section-title">보유 자격</h2>
          <InfoTable rows={CREDENTIALS} />
        </section>

        {/* 4. 찾아오시는 곳 — 지도 없이 주소 텍스트만 */}
        <section className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 className="about-section-title">찾아오시는 곳</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: "0 0 14px" }}>{COMPANY_ADDRESS}</p>
          <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
            문의{" "}
            <a href={`tel:${COMPANY_SUPPORT_PHONE}`} style={{ color: "var(--text)", fontWeight: 700 }}>
              {COMPANY_SUPPORT_PHONE}
            </a>
            <br />
            {COMPANY_SUPPORT_HOURS} (주말·공휴일 휴무)
          </div>
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 48 }}>
          <Link href="/quote" className="btn" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            견적 문의하기 →
          </Link>
          <Link href="/vehicles" className="btn-ghost" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            차량·요금 안내
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

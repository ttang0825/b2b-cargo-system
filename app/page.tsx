import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";
import { COMPANY_FREIGHT_BROKER_LICENSE } from "@/lib/companyInfo";

// 랜딩(/)의 title·description은 app/layout.tsx(루트 metadata)에서 관리함 —
// 여기서 다시 title을 export하면 루트 값을 덮어써서 두 곳을 같이 고쳐야 하므로 두지 않음
//
// ⚠️ **쓰지 않기로 한 표현**(32차 확정): "예비 배차처", "계약 없이", "기존 거래처를 바꾸",
// "1톤~5톤"처럼 상한을 못박는 표현, "25톤"·"전 차종"처럼 대형을 약속하는 표현, "이사",
// "B2B", 고객 접점의 "화주". 포지셔닝이 "보조 배차처"에서 "정식 물류 파트너"로 바뀌었다.

// 히어로 하단 신뢰 배지. 누적 실적이 없는 신생사가 내세울 수 있는 검증 가능한 지표들.
// ⚠️ 보험은 "가입" 사실까지만 — 담보 한도·범위를 여기에 추가하지 말 것
const TRUST_POINTS = [
  `화물자동차 운송주선사업 정식 허가업체 ${COMPANY_FREIGHT_BROKER_LICENSE}`,
  "세금계산서 발행 · 건별 정산 및 월정산 가능",
  "적재물배상책임보험 가입",
];

// "어떤 업체인가"가 아니라 "어떤 운송인가"로 제시한다.
// 업종을 나열하면 목록에 없는 업체가 "나는 대상이 아니다"라고 읽기 때문(32차 확정).
// 업종 정보 자체는 영업 DB와 내부 문서에 그대로 유지되며 랜딩에서만 뺐다.
const TRANSPORT_TYPES = [
  { title: "정기 납품", desc: "같은 구간을 주기적으로 오가는 운송" },
  { title: "긴급 출고", desc: "당일·익일 처리가 필요한 건" },
  { title: "창고·거점 이동", desc: "재고 이전, 센터 간 이동" },
  { title: "현장 납품", desc: "시공·설치 현장으로 직접 배송" },
  { title: "행사 반입·철수", desc: "전시·행사 장비의 왕복 운송" },
  { title: "대형 상품 배송", desc: "택배로 보내기 어려운 부피·중량 화물" },
];

const VALUES = [
  { q: "차량이 잘 잡히는가?", a: "가능 차량을 빠르게 확인하고, 배차 확정 정보를 명확히 안내합니다." },
  { q: "운임이 납득 가능한가?", a: "거리·차량·상하차·시간·대기 조건을 기준으로 운임을 설명합니다." },
  { q: "문제 생기면 대응하는가?", a: "사진·현장 상황·기사 확인을 통해 접수와 중재 절차를 운영합니다." },
  { q: "정산이 편한가?", a: "운송내역서, 세금계산서, 반복 거래 시 월정산을 제공합니다." },
  { q: "다음 거래가 더 편한가?", a: "출발지·도착지·물품·차량·상하차 조건을 저장해드립니다." },
];

// 이용 절차 3단계. 별도 페이지를 만들지 않고 기존 "이렇게 진행됩니다" 섹션을 이 내용으로
// 정비함(섹션을 새로 늘리지 않기 위해 — 기존 3단계와 역할이 겹쳤음)
const STEPS = [
  {
    n: "1",
    title: "문의·견적",
    desc: "상차지·하차지·품목만 알려주시면 차량과 운임을 확인해 연락드립니다.",
  },
  {
    n: "2",
    title: "배차 확정",
    desc: "차량 종류와 운임 내역이 담긴 견적서를 보내드립니다.",
    sub: "배차 확정 시 차량·기사 정보를 안내드립니다.",
  },
  {
    n: "3",
    title: "운송·정산",
    desc: "운송 완료 후 인수증과 정산 내역이 남습니다.",
    sub: "세금계산서 발행, 건별 정산 및 월정산 가능",
  },
];

export default function LandingPage() {
  return (
    <div className="portal-theme">
      <LandingHeader />

      {/* Hero */}
      <section style={{ background: "#1a1a1a", padding: "72px 24px 64px" }}>
        <div className="container" style={{ padding: 0, textAlign: "center" }}>
          <div style={{ color: "#FFD833", fontWeight: 700, fontSize: 13.5, marginBottom: 14 }}>
            화물자동차 운송주선사업 정식 허가업체
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 5vw, 42px)",
              fontWeight: 800,
              color: "#fff",
              margin: "0 0 18px",
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
            }}
          >
            출발부터 도착까지,
            <br />
            화물운송을 확실하게 관리합니다
          </h1>
          <p style={{ color: "#c9c9c9", fontSize: 15.5, marginBottom: 24, lineHeight: 1.6 }}>
            상·하차지와 품목만 알려주시면 차량과 운임을 확인해 연락드립니다.
            <br />
            견적서부터 월정산까지, 운송 내역이 기록으로 남습니다.
          </p>

          {/* 신뢰 배지 — 누적 실적이 없는 신생사가 내세울 수 있는 검증 가능한 지표.
              ⚠️ 보험은 "가입" 사실까지만 적을 것(담보 한도·범위나 "모든 화물이 보상된다"는
              취지의 표현을 추가하지 말 것 — 사용자가 담보 범위를 별도로 확인 중). */}
          <ul className="hero-trust">
            {TRUST_POINTS.map((t) => (
              <li key={t}>
                <span className="hero-trust-check" aria-hidden="true">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>

          {/* 견적 → 전화 순서. 두 버튼은 동등 비중이고, "고객 등록 신청"은 보조 링크 */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/quote"
              className="btn"
              style={{ padding: "15px 32px", fontSize: 15.5, display: "inline-flex" }}
            >
              무료 견적 문의 →
            </Link>
            {/* 모바일에서 탭하면 바로 발신되도록 tel: 링크. 번호는 상수 참조(하드코딩 금지) */}
            <a
              href={`tel:${COMPANY_SUPPORT_PHONE}`}
              style={{
                padding: "15px 32px",
                fontSize: 15.5,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 12,
                border: "1.5px solid #FFD833",
                color: "#FFD833",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              전화 문의 {COMPANY_SUPPORT_PHONE}
            </a>
          </div>

          <div style={{ marginTop: 18 }}>
            <Link href="/apply" className="hero-secondary-link">
              고객 등록 신청 →
            </Link>
          </div>
        </div>
      </section>

      {/* 운송 유형 */}
      <section className="container" style={{ padding: "56px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>
          이런 운송을 맡고 있습니다
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
          업종과 규모에 관계없이 문의해 주세요.
        </p>
        <div className="home-grid">
          {TRANSPORT_TYPES.map((t) => (
            // 카드마다 똑같이 붙던 "B2B" 태그는 제거함 — 고객 접점에서 B2B 표현을 쓰지 않기로
            // 했고(용어정리 가이드 2-3), 6개 카드가 전부 같은 값이라 정보량도 없었음
            <div key={t.title} className="card" style={{ padding: 22 }}>
              <h3 className="home-card-title">{t.title}</h3>
              <p className="home-card-desc">{t.desc}</p>
            </div>
          ))}
        </div>
        {/* 목록이 "취급 범위 한정"으로 읽히지 않도록 하는 문구 — 지우지 말 것 */}
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13.5, marginTop: 20, marginBottom: 0 }}>
          목록에 없는 운송도 문의해 주세요. 가능 여부를 확인해 안내드립니다.
        </p>
      </section>

      {/* 핵심가치 */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ padding: "56px 24px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
            위캐리를 선택하는 이유
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640, margin: "0 auto" }}>
            {VALUES.map((v) => (
              <div key={v.q} className="card" style={{ padding: "18px 22px" }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 6 }}>{v.q}</div>
                <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{v.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 이용 방법 */}
      <section className="container" style={{ padding: "56px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
          이렇게 진행됩니다
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          {STEPS.map((s) => (
            <div key={s.n} className="card" style={{ padding: 24, textAlign: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#1a1a1a",
                  color: "#FFD833",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  margin: "0 auto 14px",
                }}
              >
                {s.n}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              {s.sub && (
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.6 }}>
                  → {s.sub}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 첫거래 혜택 */}
      <section className="container" style={{ padding: "0 24px 56px" }}>
        <div className="card" style={{ padding: 28, background: "var(--accent-soft)", border: "none", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--accent)", marginBottom: 10 }}>
            신규 고객 첫 거래 혜택
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.9, color: "var(--text)" }}>
            <li>자주 나가는 구간 무료 비교 견적</li>
            {/* ⚠️ 금액·비율을 쓰지 않는다 — 한시 프로모션이라 적용 조건·기간이 미확정이고,
                조건 없이 금액만 게시하면 표시광고 문제가 된다. 조건이 확정되면 그때 함께 표기할 것 */}
            <li>첫 운송 운임 지원</li>
            <li>반복 주소·물품 조건 저장</li>
            <li>운송 내역서 및 세금계산서 처리 지원</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#1a1a1a", padding: "48px 24px", textAlign: "center" }}>
        <div className="container" style={{ padding: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
            지금 바로 견적을 받아보세요
          </h2>
          <p style={{ color: "#c9c9c9", fontSize: 14.5, lineHeight: 1.7, marginTop: 0, marginBottom: 24 }}>
            상·하차지와 품목만 알려주시면 확인해 연락드립니다.
            <br />
            고객센터 {COMPANY_SUPPORT_PHONE} · {COMPANY_SUPPORT_HOURS}
          </p>
          {/* 버튼 순서는 히어로와 동일하게 견적 → 전화 */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/quote" className="btn" style={{ padding: "14px 30px", fontSize: 15 }}>
              무료 견적 문의 →
            </Link>
            <a
              href={`tel:${COMPANY_SUPPORT_PHONE}`}
              style={{
                padding: "14px 30px",
                fontSize: 15,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 12,
                border: "1.5px solid #FFD833",
                color: "#FFD833",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              전화 문의 {COMPANY_SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";

// 랜딩(/)의 title·description은 app/layout.tsx(루트 metadata)에서 관리함 —
// 여기서 다시 title을 export하면 루트 값을 덮어써서 두 곳을 같이 고쳐야 하므로 두지 않음

const TARGETS = [
  { title: "중소 제조업체", desc: "부품·원자재·완제품 납품, 공장 간 이동" },
  { title: "도매·유통·자재 업체", desc: "거래처 납품, 창고 이동, 긴급 출고" },
  { title: "패키징공장·포장재 업체", desc: "박스·포장재·완충재 반복 납품" },
  { title: "가구·인테리어 업체", desc: "고객 현장 납품, 자재 운송" },
  { title: "행사·전시·렌탈 업체", desc: "행사 전후 반입·철수, 장비 운송" },
  { title: "택배 불가 온라인 셀러", desc: "대형상품·대량 출고·창고 이동" },
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
            중소기업과 개인 고객을 위한 화물 배차 파트너
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
            정기 납품, 긴급 출고, 창고 이동
            <br />
            1톤부터 5톤까지 빠르게 연결합니다
          </h1>
          <p style={{ color: "#c9c9c9", fontSize: 15.5, marginBottom: 32, lineHeight: 1.6 }}>
            기존 거래처를 바꾸실 필요 없습니다. 급한 건이나 차량이 안 잡힐 때,
            <br />
            예비 배차처로 편하게 이용해보세요.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/quote"
              className="btn"
              style={{ padding: "15px 32px", fontSize: 15.5, display: "inline-flex" }}
            >
              무료 견적 받기 →
            </Link>
            <Link
              href="/apply"
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
              고객 등록 신청 →
            </Link>
          </div>
        </div>
      </section>

      {/* 타겟 업종 */}
      <section className="container" style={{ padding: "56px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>
          이런 업체에 필요합니다
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
          납품·출고·창고 이동에 1톤~5톤 화물차가 필요하면 어디든 환영합니다.
          <br />한 건도, 정기 운송도 가능합니다.
        </p>
        <div className="home-grid">
          {TARGETS.map((t) => (
            // 카드마다 똑같이 붙던 "B2B" 태그는 제거함 — 고객 접점에서 B2B 표현을 쓰지 않기로
            // 했고(용어정리 가이드 2-3), 6개 카드가 전부 같은 값이라 정보량도 없었음
            <div key={t.title} className="card" style={{ padding: 22 }}>
              <h3 className="home-card-title">{t.title}</h3>
              <p className="home-card-desc">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심가치 */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ padding: "56px 24px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
            왜 예비 배차처로 저희를 선택할까요
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
            <li>첫 운송 10% 지원 (최대 3만원)</li>
            <li>반복 주소·물품 조건 저장</li>
            <li>운송 내역서 및 세금계산서 처리 지원</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#1a1a1a", padding: "48px 24px", textAlign: "center" }}>
        <div className="container" style={{ padding: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
            지금 바로 견적을 받아보세요
          </h2>
          <Link href="/quote" className="btn" style={{ padding: "14px 30px", fontSize: 15 }}>
            무료 견적 문의하기 →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

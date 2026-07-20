import Link from "next/link";

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

const STEPS = [
  { n: "1", title: "견적 문의", desc: "출발지, 도착지, 물품, 희망 시간만 남겨주세요." },
  { n: "2", title: "차량·운임 확인", desc: "가능 차량과 운임을 빠르게 안내드립니다." },
  { n: "3", title: "배차·운송 진행", desc: "배차 확정 정보와 함께 안전하게 운송해드립니다." },
];

export default function LandingPage() {
  return (
    <div className="portal-theme">
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          className="container"
          style={{
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="brand" style={{ fontSize: 17 }}>
            EGG 운송
          </span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/customer/login" className="guide-link">
              화주 로그인
            </Link>
            <Link href="/quote" className="btn" style={{ padding: "9px 16px", fontSize: 13 }}>
              견적 문의
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "#1a1a1a", padding: "72px 24px 64px" }}>
        <div className="container" style={{ padding: 0, textAlign: "center" }}>
          <div style={{ color: "#FFD833", fontWeight: 700, fontSize: 13.5, marginBottom: 14 }}>
            중소기업을 위한 B2B 화물 배차 파트너
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
          <Link
            href="/quote"
            className="btn"
            style={{ padding: "15px 32px", fontSize: 15.5, display: "inline-flex" }}
          >
            무료 견적 받기 →
          </Link>
        </div>
      </section>

      {/* 타겟 업종 */}
      <section className="container" style={{ padding: "56px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>
          이런 업체에 필요합니다
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>
          납품·출고·창고 이동에 1톤~5톤 화물차가 필요한 업체라면 어디든 환영합니다.
        </p>
        <div className="home-grid">
          {TARGETS.map((t) => (
            <div key={t.title} className="card" style={{ padding: 22 }}>
              <div className="home-card-tag">B2B</div>
              <h3 className="home-card-title" style={{ marginTop: 10 }}>{t.title}</h3>
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
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 첫거래 혜택 */}
      <section className="container" style={{ padding: "0 24px 56px" }}>
        <div className="card" style={{ padding: 28, background: "var(--accent-soft)", border: "none", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--accent)", marginBottom: 10 }}>
            신규 화주 첫 거래 혜택
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

      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div
          className="container"
          style={{
            padding: "32px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>📞 고객센터</div>
            <a href="tel:1588-0000" className="num" style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#8a6d00", textDecoration: "none", marginBottom: 6 }}>
              1588-0000
            </a>
            <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>
              평일 09:00 ~ 18:00
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> (주말·공휴일 휴무)</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>EGG 운송 통합 운영 시스템</div>
        </div>
      </footer>
    </div>
  );
}

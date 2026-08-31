import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";
import { startPrices as START_PRICES, vehicles as LANDING_VEHICLES } from "@/components/landing/data";

// 차량·요금 안내. 실무 문의 1순위인 "어떤 차가 얼마나 싣고 얼마인가"에 답하는 페이지.
//
// ⚠️ **요금 공개 범위**: 시작가(10km 이내 최소 운임)만 공개하고 전체 운임표·추가비 기준은
// 공개하지 않기로 함. 그래서 아래 PRICING_NOTES(표시가격 안내 문구)가 **반드시 표 바로 아래
// 있어야 함** — 없으면 "홈페이지에 4만원이라던데 왜 다르냐"는 분쟁 근거가 됨. 지우지 말 것.
//
// 🔴 **시작가는 `components/landing/data.ts` 의 `startPrices` 를 그대로 읽는다** —
// 30차 리뷰 전에는 이 파일과 랜딩 모달에 각각 적혀 있었다. 다시 갈라 적지 말 것.
// ⚠️ 자동 연동은 아니다(손으로 맞춘 값) — **운임기준표를 바꾸는 마이그레이션과 항상 같은
// PR 에서 함께** 움직일 것. 30차 리뷰에 `verify` 로 11차급 전부를 실측해 맞췄다.
//
// ⚠️ **「차종·적재 용량」 표는 30차 리뷰에서 뺐다**(사용자 지시 — 요금 안내는 시작가만).
// 되살리려면 8~25톤 5개 차급의 CBM·적재 예시를 먼저 정해야 한다(28차에 만든 6종 값은
// 커밋 이력에 남아 있다).

const PRICING_NOTES = [
  // ⚠️ 아래 3줄은 표시가격 분쟁을 막는 필수 문구다. 지우지 말 것.
  "표시 금액은 10km 이내 기준 최소 운임이며, 부가가치세는 별도입니다.",
  "실제 운임은 운송 거리, 차량 종류, 상·하차 조건, 운송 시간대, 화물 특성에 따라 달라집니다.",
  "정확한 금액은 견적 시 안내해 드립니다.",
  // 🔴 30차에 25톤 기준으로 바뀌었다(사용자 확정). "전 차종"·"모든 차량"은 여전히 금지다.
  "차급은 1톤부터 25톤까지 안내드립니다. 그 밖의 조건은 문의해 주시면 확인해 드립니다.",
];

// 🔴 30차에 4종 → **12종**이 됐다(사용자 확정). 랜딩과 **같은 순서·같은 이름·같은
// 이미지**를 써야 한다 — 랜딩에서 12개를 보고 이 화면에 들어왔는데 4개만 있으면 안 된다.
// 그래서 배열을 여기에 다시 적지 않고 랜딩 데이터(`components/landing/data.ts`)를 그대로
// 읽는다. **두 곳에 각각 적으면 조용히 갈린다.**
//
// ⚠️ 이 이름들은 **발주 폼 선택지와 다르다** — 폼은 차급 11종과 형태 21종을 각각 고르는
// 구조라 「5톤 윙바디」라는 선택지가 없다. 이름은 시안 그대로 두기로 확정됐고, 그 간극은
// 랜딩과 이 화면의 안내 한 줄이 메운다. 폼 값으로 바꾸지 말 것.

export default function VehiclesPage() {
  return (
    <div className="portal-theme">
      <LandingHeader />

      <main className="container" style={{ maxWidth: 760, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">차량·요금 안내</h1>
            <p className="page-desc">차급별 운임이 어디서부터 시작하는지, 어떤 차량 형태로 배차되는지 안내합니다.</p>
          </div>
        </div>

        {/* 시작가 */}
        <section className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
          <h2 className="about-section-title" style={{ padding: "24px 24px 0", margin: 0 }}>
            시작가
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>차량</th>
                  <th>시작가</th>
                </tr>
              </thead>
              <tbody>
                {START_PRICES.map((p) => (
                  <tr key={p.ton}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{p.ton}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{p.from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ⚠️ 표시가격 안내 — 표 바로 아래에 반드시 있어야 함. 지우지 말 것 */}
          <ul
            style={{
              margin: 0,
              padding: "18px 24px 24px 40px",
              fontSize: 13,
              lineHeight: 1.8,
              color: "var(--text-muted)",
            }}
          >
            {PRICING_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        {/* 차량 형태 */}
        <section className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 className="about-section-title">차량 형태</h2>
          {/* 🔴 차량 범위 표현 기준이 30차에 **「1톤부터 25톤까지」**로 바뀌었다(사용자 확정).
              12차·34차의 「1톤부터 5톤 이상까지」를 근거로 되돌리지 말 것 —
              `rate_distance_tiers` 에 25톤 행이 실재하고 차급이 11종이라 견적이 실제로
              산출된다(52차).
              🔴 **"전 차종"·"모든 차량"·"특수차량"은 여전히 금지다** — 25톤이 풀렸다고
              함께 풀린 것이 아니다(트레일러·크레인은 취급 범위 밖).
              ⚠️ 이 문장은 랜딩 차량 형태 섹션(app/page.tsx)과 기준이 같다 —
              한쪽을 고치면 다른 쪽도 같이 볼 것. */}
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 16px" }}>
            1톤부터 25톤까지 다양한 차량에 배차가 가능합니다.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {LANDING_VEHICLES.map((v) => (
              <div key={v.name}>
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "var(--bg)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.img}
                    alt={v.name}
                    loading="lazy"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 700, wordBreak: "keep-all" }}>{v.name}</div>
                <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)", wordBreak: "keep-all" }}>
                  {v.desc}
                </div>
              </div>
            ))}
          </div>
          {/* 🔴 랜딩과 같은 안내다 — 이름이 발주 폼 선택지와 다른 간극을 메운다. 지우지 말 것. */}
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 8px" }}>
            발주 요청에서는 차량 크기와 형태를 각각 선택합니다. 예를 들어 「5톤 윙바디」는 5톤 + 윙바디로 고르시면 됩니다.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            그 밖의 차량 형태가 필요하시면 문의해 주세요. 가능 여부를 확인해 안내드립니다.
          </p>
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 48 }}>
          <Link href="/quote" className="btn" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            견적 문의하기 →
          </Link>
          <Link href="/about" className="btn-ghost" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            회사소개
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

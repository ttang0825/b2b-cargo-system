import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";

// 차량·요금 안내. 실무 문의 1순위인 "어떤 차가 얼마나 싣고 얼마인가"에 답하는 페이지.
//
// ⚠️ **요금 공개 범위**: 시작가(10km 이내 최소 운임)만 공개하고 전체 운임표·추가비 기준은
// 공개하지 않기로 함. 그래서 아래 PRICING_NOTES(표시가격 안내 문구)가 **반드시 표 바로 아래
// 있어야 함** — 없으면 "홈페이지에 4만원이라던데 왜 다르냐"는 분쟁 근거가 됨. 지우지 말 것.
//
// ⚠️ **단일 소스가 아님**: 아래 시작가는 운임기준표(`rate_*` 테이블)에서 자동으로 가져오는 값이
// 아니라 손으로 옮겨 적은 값임. **운임기준표가 바뀌면 이 파일의 START_PRICES도 함께 갱신할 것.**

const VEHICLE_SPECS: { name: string; capacity: string; example: string }[] = [
  { name: "1톤", capacity: "4~5CBM", example: "소량 박스, 택배로 보내기 어려운 물품" },
  { name: "1.4톤", capacity: "6CBM", example: "박스 다수, 소형 장비" },
  { name: "2.5톤", capacity: "14CBM", example: "파렛트 화물, 중량 박스" },
  { name: "3.5톤", capacity: "17CBM", example: "중형 납품 물량" },
  { name: "5톤", capacity: "28CBM", example: "파렛트 다수, 대량 물량" },
  { name: "5톤 플러스/축", capacity: "35CBM", example: "장거리·대량 물량" },
];

const START_PRICES: { name: string; price: string }[] = [
  { name: "1톤", price: "40,000원부터" },
  { name: "1.4톤", price: "50,000원부터" },
  { name: "2.5톤", price: "70,000원부터" },
  { name: "3.5톤", price: "80,000원부터" },
  { name: "5톤", price: "90,000원부터" },
  { name: "5톤 플러스/축", price: "110,000원부터" },
];

const PRICING_NOTES = [
  // ⚠️ 아래 3줄은 표시가격 분쟁을 막는 필수 문구다. 지우지 말 것.
  "표시 금액은 10km 이내 기준 최소 운임이며, 부가가치세는 별도입니다.",
  "실제 운임은 운송 거리, 차량 종류, 상·하차 조건, 운송 시간대, 화물 특성에 따라 달라집니다.",
  "정확한 금액은 견적 시 안내해 드립니다.",
  // 상한을 닫지 않되 약속도 하지 않는 표현. "25톤"·"전 차종"으로 바꾸지 말 것(32차 확정)
  "5톤 이상 대형 차량도 문의 주시면 확인해 안내드립니다.",
];

// `lib/constants.ts`의 BODY_TYPES는 11종(냉장탑·냉동탑·크레인·렉카·트레일러·사다리차 포함)이지만
// 취급 범위가 확정되지 않아 전부 노출하지 않음(원칙 50번 — 상수를 그대로 순회하지 말고
// 실제로 보여줄 값만 담은 로컬 배열로 좁힐 것). 냉장·냉동 등을 추가할지는 확인 후 결정.
const BODY_TYPES_SHOWN = ["카고", "탑차", "윙바디", "리프트"] as const;

export default function VehiclesPage() {
  return (
    <div className="portal-theme">
      <LandingHeader />

      <main className="container" style={{ maxWidth: 760, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">차량·요금 안내</h1>
            <p className="page-desc">어떤 차량에 얼마나 실을 수 있는지, 운임은 어디서부터 시작하는지 안내합니다.</p>
          </div>
        </div>

        {/* 차종·적재량 */}
        <section className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
          <h2 className="about-section-title" style={{ padding: "24px 24px 0", margin: 0 }}>
            차종·적재 용량
          </h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>차량</th>
                  <th>적재 용량</th>
                  <th>실을 수 있는 예</th>
                </tr>
              </thead>
              <tbody>
                {VEHICLE_SPECS.map((v) => (
                  <tr key={v.name}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{v.name}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{v.capacity}</td>
                    <td>{v.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
                  <tr key={p.name}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{p.name}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{p.price}</td>
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
          {/* 차량 범위 표현 기준(32차): "다마스·라보부터 1톤~5톤 이상까지".
              ⚠️ "25톤"·"전 차종"은 쓰지 말 것 — 배차망으로 대형이 가능하긴 하나
              아직 수월하지 않아 약속하지 않기로 함 */}
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 14px" }}>
            다마스·라보부터 1톤~5톤 이상까지 다양한 차량에 배차가 가능합니다.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {BODY_TYPES_SHOWN.map((t) => (
              <span key={t} className="badge">
                {t}
              </span>
            ))}
          </div>
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

import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";
import { vehicles as LANDING_VEHICLES } from "@/components/landing/data";
import { fetchStartPrices, formatStartPrice, START_PRICE_NOTE } from "@/lib/startPrices";

// 차량·요금 안내. 실무 문의 1순위인 "어떤 차가 얼마나 싣고 얼마인가"에 답하는 페이지.
//
// ⚠️ **요금 공개 범위**: 기준가(10km 이내 한 칸)만 공개하고 전체 운임표·추가비 기준은
// 공개하지 않기로 함. 그래서 아래 PRICING_NOTES(표시가격 안내 문구)가 **반드시 표 바로 아래
// 있어야 함** — 없으면 "홈페이지에 4만원이라던데 왜 다르냐"는 분쟁 근거가 됨. 지우지 말 것.
//
// 🔴 **기준가는 32차부터 운임기준표(`rate_distance_tiers` 의 「10km 이내」)를
// 실시간으로 읽는다** — 정의처는 `lib/startPrices.ts` 하나이고 랜딩 요금 가이드 모달도
// 같은 값을 본다. 숫자를 이 파일에 다시 적지 말 것.
// ⚠️ 그래서 이제 **`/admin/rates` 에서 숫자를 고치면 이 화면 게시가가 바로 바뀐다.**
// 그 화면은 클릭이 곧 저장이고 되돌리기가 없다 — 오타가 그대로 게시된다.
//
// ⚠️ **「차종·적재 용량」 표는 30차 리뷰에서 뺐다**(사용자 지시 — 요금 안내는 기준가만).
// 되살리려면 8~25톤 5개 차급의 CBM·적재 예시를 먼저 정해야 한다(28차에 만든 6종 값은
// 커밋 이력에 남아 있다).

// 🔴 30차에 4종 → **12종**이 됐다(사용자 확정). 랜딩과 **같은 순서·같은 이름·같은
// 이미지**를 써야 한다 — 랜딩에서 12개를 보고 이 화면에 들어왔는데 4개만 있으면 안 된다.
// 그래서 배열을 여기에 다시 적지 않고 랜딩 데이터(`components/landing/data.ts`)를 그대로
// 읽는다. **두 곳에 각각 적으면 조용히 갈린다.**
//
// ⚠️ 이 이름들은 **발주 폼 선택지와 다르다** — 폼은 차급 11종과 형태 21종을 각각 고르는
// 구조라 「5톤 윙바디」라는 선택지가 없다. 이름은 시안 그대로 두기로 확정됐고, 그 간극은
// 랜딩과 이 화면의 안내 한 줄이 메운다. 폼 값으로 바꾸지 말 것.

/* 🔴 원칙 21번 — 운임기준표를 고친 직후에도 이 화면이 새 값을 보여야 하므로
   정적 생성으로 굳히지 않는다. `fetchStartPrices()` 안의 service client 가 fetch
   캐시까지 끈다(둘 다 있어야 한다). */
export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const { prices: START_PRICES } = await fetchStartPrices();

  return (
    <div className="portal-theme">
      <LandingHeader />

      <main className="container" style={{ maxWidth: 760, paddingTop: 40 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">차량·요금 안내</h1>
            <p className="page-desc">차급별 기준가와 어떤 차량 형태로 배차되는지 안내합니다. 실제 운임은 조건에 따라 기준가에서 ± 됩니다.</p>
          </div>
        </div>

        {/* 기준가 */}
        <section className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
          <h2 className="about-section-title" style={{ padding: "24px 24px 0", margin: 0 }}>
            기준가
          </h2>
          {/* 🔴 표시가격 안내 — **표 위 설명글**로 합쳤고(사용자 지시 2026-09-01,
              팝업과 같은 구성), 2026-09-02 에 세 줄로 줄였다. 문구는 `lib/startPrices.ts`
              가 유일 정의처다. 지우지 말 것 — 「10km 이내」·「부가세」·「견적」·「5톤보다
              큰 차량도 문의」 넷이 표시가격 분쟁을 막는 문장이다.
              🔴 `whiteSpace: "pre-line"` 을 빼지 말 것 — 빼면 세 줄이 한 문단으로 붙는다. */}
          <p style={{ margin: 0, padding: "10px 24px 0", fontSize: 13.5, lineHeight: 1.8, color: "var(--text-muted)", whiteSpace: "pre-line" }}>
            {START_PRICE_NOTE}
          </p>
          {/* 🔴 값을 못 읽었으면 표를 그리지 않는다 — 위와 같은 이유(lib/startPrices.ts) */}
          {!START_PRICES.length && (
            <p style={{ margin: 0, padding: "10px 24px 24px", fontSize: 13.5, lineHeight: 1.8, color: "var(--text-muted)" }}>
              기준가를 불러오지 못했습니다. 정확한 금액은 견적으로 안내드립니다.
            </p>
          )}
          {START_PRICES.length > 0 && (
          <div className="table-scroll" style={{ marginTop: 14, paddingBottom: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>차량</th>
                  <th>기준가</th>
                </tr>
              </thead>
              <tbody>
                {START_PRICES.map((p) => (
                  <tr key={p.ton}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{p.ton}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatStartPrice(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

        </section>

        {/* 차량 형태 */}
        <section className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h2 className="about-section-title">차량 형태</h2>
          {/* 🔴 차량 범위 표현은 30차 리뷰에 **시안 문구**(「1톤부터 5톤 이상, 특수차량까지」)로 확정됐다.
              12차·34차의 「1톤부터 5톤 이상까지」를 근거로 되돌리지 말 것 —
              `rate_distance_tiers` 에 25톤 행이 실재하고 차급이 11종이라 견적이 실제로
              산출된다(52차).
              🔴 **"전 차종"·"모든 차량"·"특수차량"은 여전히 금지다** — 25톤이 풀렸다고
              함께 풀린 것이 아니다(트레일러·크레인은 취급 범위 밖).
              ⚠️ 이 문장은 랜딩 차량 형태 섹션(app/page.tsx)과 기준이 같다 —
              한쪽을 고치면 다른 쪽도 같이 볼 것. */}
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 16px" }}>
            1톤부터 5톤 이상, 특수차량까지 필요한 차량 형태로 배차해드립니다.
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

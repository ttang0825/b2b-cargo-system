// 랜딩(/) 이미지 경로의 **유일한 정의처**.
//
// 🔴 **컴포넌트·데이터 파일에 경로를 직접 박지 말 것.** 사진을 교체할 때 랜딩 전체를
// 뒤지지 않아도 되도록 30차에도 이 규칙을 유지했다(디자인팀 `data.ts` 는 `/public`
// 경로를 직접 적어 왔고 `TODO(dev)` 로 표시해 뒀다 — 전부 이 파일 참조로 바꿨다).
//
// ── 30차에 구조가 통째로 바뀌었다 ──────────────────────────────────────────
// 11~13차 구조는 **5종 · 전부 `null` 자리표시자**였고 `components/LandingImage.tsx` 가
// "이미지 준비 중" 회색 상자를 대신 그렸다. 30차에 디자인팀이 **실물 32종**을 주면서
// 자리표시자가 필요 없어졌다 — 그래서 `null` 을 허용하지 않는 `string` 타입이다.
// 🔴 **`null` 을 다시 허용하지 말 것** — 허용하면 "이미지가 없어도 통과"하게 되어
// 파일이 빠진 것을 빌드도 검증도 못 잡는다.
//
// ⚠️ `components/LandingImage.tsx` 는 이제 아무 데서도 쓰이지 않는다(자리표시자 상자를
// 그리던 컴포넌트다). 지우지 않고 뒀다 — 50차가 죽은 파일을 정리하지 않고 남긴 것과 같은
// 처리이며, 되살릴 일이 생기면 그때 판단한다.
//
// ── 파일 규칙 ────────────────────────────────────────────────────────────
// 실제 파일은 `public/landing/` 에 있고 **파일명 번호 = 화면 노출 순서**다.
// 🔴 순서를 바꾸려면 아래 배열 순서를 바꿀 것 — 파일명을 바꾸지 말 것(디자인팀 정본과
// 대조가 안 된다).
//
// 🟢 `service-01-personal.jpg` 는 **zip 에 들어온 것이 이미 교체본**이다(사용자 확인
// 2026-08-31). 나중에 또 바뀌면 **같은 파일명으로 덮어쓰면** 코드를 건드릴 필요가 없다.

const BASE = "/landing";

/** 히어로(교차 페이드 2장) · CTA 배경 · TMS 전체 화면 · 로고 */
export const LANDING_IMAGES = {
  heroMain: `${BASE}/hero-main.jpg`,
  heroAlt: `${BASE}/hero-alt.jpg`,
  ctaBg: `${BASE}/cta-bg.jpg`,
  tmsOverview: `${BASE}/tms-overview.png`,
  /** ⚠️ 헤더·접수완료 화면은 이 파일이 아니라 `<BrandLogo />`(인라인 SVG)를 쓴다 —
   *  `currentColor` 를 상속받아야 다크 배경에서도 보이기 때문(27차). */
  logo: `${BASE}/wecarry-logo.svg`,
} as const;

/** 위캐리 서비스 4종 — 키 순서가 노출 순서 */
export const LANDING_SERVICE_IMAGES = {
  personal: `${BASE}/service-01-personal.jpg`,
  nationwide: `${BASE}/service-02-nationwide.jpg`,
  mixed: `${BASE}/service-03-mixed.jpg`,
  moving: `${BASE}/service-04-moving.jpg`,
} as const;

/** WHY WECARRY 5종.
 *  ⚠️ `insurance` 는 `lib/insuranceInfo.ts` 의 `INSURANCE_ENABLED` 가 false 인 동안
 *  카드 자체가 렌더링되지 않으므로 화면에 나타나지 않는다. */
export const LANDING_REASON_IMAGES = {
  tms: `${BASE}/why-01-tms.png`,
  dispatch: `${BASE}/why-02-dispatch.png`,
  insurance: `${BASE}/why-03-insurance.png`,
  settlement: `${BASE}/why-04-settlement.png`,
  price: `${BASE}/why-05-price.png`,
} as const;

/** 차량 형태 12종 — 배열 순서가 노출 순서다(파일명 번호와 같다). */
export const LANDING_VEHICLE_IMAGES = [
  `${BASE}/vehicle-01-cargo.jpg`,
  `${BASE}/vehicle-02-top.jpg`,
  `${BASE}/vehicle-03-wing.jpg`,
  `${BASE}/vehicle-04-lift.jpg`,
  `${BASE}/vehicle-05-wing-lift.jpg`,
  `${BASE}/vehicle-06-horu.jpg`,
  `${BASE}/vehicle-07-freezer.jpg`,
  `${BASE}/vehicle-08-nonvibration.jpg`,
  `${BASE}/vehicle-09-top-5t.jpg`,
  `${BASE}/vehicle-10-wing-mid.jpg`,
  `${BASE}/vehicle-11-longcargo.jpg`,
  `${BASE}/vehicle-12-wing-5t.jpg`,
] as const;

/** TMS 캐러셀 6종 — 배열 순서가 노출 순서 */
export const LANDING_TMS_IMAGES = [
  `${BASE}/tms-01-request.png`,
  `${BASE}/tms-02-quotes.png`,
  `${BASE}/tms-03-dispatch.png`,
  `${BASE}/tms-04-invoices.png`,
  `${BASE}/tms-05-stats.png`,
  `${BASE}/tms-06-locations.png`,
] as const;

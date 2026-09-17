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
  /** 🔴 **히어로 축소본 4장은 중복이 아니다 — 「정리」하지 말 것**(2026-09-17).
   *  사진 띠는 1600px 화면에서 약 1208px 폭이라 2912px 원본이 **0.5배로 줄어** 그려지고,
   *  그 위에서 10초 교차 애니메이션이 계속 돈다. 그 조합에서 크롬이 사진을 저품질로
   *  줄이면 **트럭 옆면 로고의 사선이 계단처럼 깨진다**(사용자 신고).
   *  아래 파일들을 `image-set()` 으로 걸어 **줄이는 비율을 1배 가까이로** 만든다.
   *  🔴 **원본 2장을 지우지 말 것** — 2배율 이상 화면과 모바일이 그것을 쓴다. */
  heroMain1600: `${BASE}/hero-main-1600.jpg`,
  heroMain2400: `${BASE}/hero-main-2400.jpg`,
  heroAlt1600: `${BASE}/hero-alt-1600.jpg`,
  heroAlt2400: `${BASE}/hero-alt-2400.jpg`,
  ctaBg: `${BASE}/cta-bg.jpg`,
  tmsOverview: `${BASE}/tms-overview.png`,
  /** ⚠️ 헤더·접수완료 화면은 이 파일이 아니라 `<BrandLogo />`(인라인 SVG)를 쓴다 —
   *  `currentColor` 를 상속받아야 다크 배경에서도 보이기 때문(27차). */
  logo: `${BASE}/wecarry-logo.svg`,
} as const;

/**
 * 히어로 배경용 `image-set()` 문자열.
 *
 * 브라우저가 화면 배율에 맞는 파일 **하나만** 받는다 —
 * 1x → 1600 · 1.25·1.5x → 2400 · 2x 이상 → 원본(2912).
 *
 * 🔴 **`image-set()` 을 모르는 브라우저는 이 선언을 통째로 버린다** — 그러면 배경이
 * 사라지므로 호출부가 `--hero-fallback` 커스텀 속성을 함께 주고
 * `app/landing.css` 가 `background-image: var(--hero-fallback)` 로 받는다.
 * **둘은 한 벌이라 한쪽만 지우지 말 것.**
 * 🟢 지원하는 브라우저에서는 인라인 선언이 이겨서 **대체 이미지를 받지 않는다**(실측).
 */
export function heroImageSet(x1: string, x15: string, x2: string): string {
  return `image-set(url('${x1}') 1x, url('${x15}') 1.5x, url('${x2}') 2x)`;
}

/** 위캐리 서비스 4종 — 키 순서가 노출 순서 */
export const LANDING_SERVICE_IMAGES = {
  /** ⚠️ 파일명만 `00` 이다 — 30차 zip 에 없던 사진이라 뒤늦게 들어왔고(사용자 제작,
   *  2026-09-03), 노출 순서가 맨 앞이라 그 자리에 맞춰 번호를 붙였다.
   *  🔴 원본은 1536×1024(3:2)로 왔고 **왼쪽 171px 을 잘라 576×432(4:3)로 맞춘 것**이다.
   *  카드가 `objectFit: cover` 라 3:2 를 그대로 두면 브라우저가 가운데를 잘라
   *  **트럭 앞범퍼가 날아간다.** 사진을 교체할 때도 4:3 으로 맞춰서 넣을 것. */
  fixed: `${BASE}/service-00-fixed.jpg`,
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

// 사이트 절대 주소의 **유일한 정의처**다. 🔴 다른 파일에 주소를 적지 말 것.
//
// 🔴 **메인은 `www` 없는 짧은 쪽이다**(사용자 확정 2026-09-01) — 명함·문자·전화
//    안내에 쓰기 위해서다. Vercel 기본값은 반대(www 가 메인)였고 그것을 뒤집었다.
//    `www.wecarrylogis.co.kr` 은 308 로 이쪽으로 넘어온다. **되돌리지 말 것** —
//    `www` 를 붙이면 canonical 과 308 리다이렉트가 서로 싸운다.
//
// ⚠️ **예전에는 `VERCEL_PROJECT_PRODUCTION_URL` 환경변수를 읽었다**(23차). 커스텀
//    도메인이 붙으면 그 값도 따라온다고 보았으나, **그 값이 실제로 무엇인지 배포
//    바깥에서는 확인할 수 없어** 추측 위에 문자·메일 링크가 얹히는 구조였다.
//    도메인이 확정됐으므로 상수로 못박는다 — 환경변수로 빼지 않은 이유는 Vercel 에서
//    Production 만 체크하고 Preview 를 빠뜨리는 함정(`CLAUDE.md` 7절)을 만들지 않기
//    위해서다. 🔴 **주소가 또 바뀌면 이 상수 한 줄만 고치면 된다.**
//
// ⚠️ `b2b-cargo-system.vercel.app`(Vercel 기본 주소)은 그대로 살아 있다 — 도메인에
//    문제가 생겼을 때 들어갈 길이라 죽이지 않았다. 다만 **문자·메타에는 안 쓴다.**
export const SITE_URL = "https://wecarrylogis.co.kr";

// 링크 미리보기(카카오톡·페이스북·슬랙)용 이미지. 1200×630 · JPEG.
// 🔴 `og:image` 는 **반드시 절대 URL**이어야 한다 — 상대경로면 카카오톡이 못 읽는다.
//    `metadataBase` 가 있으면 Next 가 자동으로 절대화하지만, 실제 출력 HTML 로 확인할 것.
// ⚠️ 랜딩 이미지(`lib/landingImages.ts`)와 성격이 다르다 — 화면에 그리는 것이 아니라
//    메타데이터 전용이라 그 파일에 넣지 않았다.
export const OG_IMAGE_PATH = "/og-wecarry-1200x630.jpg";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = "위캐리 운송 · 화물 배차·운송 주선 · 1661-2403";

export function getSiteUrl(): string {
  return SITE_URL;
}

export function getPortalLoginUrl(): string {
  return `${SITE_URL}/customer/login`;
}

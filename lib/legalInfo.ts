// 법적 문서(이용약관 `/terms`, 개인정보처리방침 `/privacy`, 이메일무단수집거부
// `/email-policy`)가 공유하는 상수의 유일 정의처.
//
// 시행일이 세 문서에 걸쳐 여러 번 등장하고 아직 확정되지 않아서, 화면마다 날짜를
// 적지 않고 여기 한 곳만 고치면 전부 갱신되도록 모아둠.
//
// ⚠️ 회사 기본 정보(상호·대표자·주소·사업자등록번호·허가번호)는 이 파일이 아니라
// `lib/companyInfo.ts`가 유일 정의처임. 대표번호는 `lib/contactInfo.ts`.
// **같은 값을 여기에 다시 적지 말 것.**

// ── 시행일 ────────────────────────────────────────────────────────────────────

// 실제 공개일(2026-09-07, 월). 값과 아래 플래그는 **항상 같이** 바꿀 것 —
// 값만 바꾸고 플래그를 true로 두면 빌드 경고가 계속 남는다.
//
// ⚠️ **화면에 나오는 곳은 11곳이다**(예전 주석의 "5곳"은 문서 본문만 센 숫자였음).
// 시행일을 바꾸면 아래를 전부 확인할 것:
//   본문 5개 표시 항목 — `lib/legal/terms.ts`(약관 부칙) /
//     `lib/legal/privacy.ts`(시행일자·최종 개정일이 **한 줄에 2항목** + 부칙) /
//     이메일무단수집거부 게시일
//   페이지 헤더 3곳 — `app/terms|privacy|email-policy/page.tsx`
//   모달 헤더 3곳 — `components/LegalLinks.tsx`
// 🔴 이메일무단수집거부 게시일은 `lib/legal/emailPolicy.ts`에 참조가 **0건**이고
//    `app/email-policy/page.tsx`가 `effectiveLabel` prop으로 넘긴다 —
//    내용 파일만 보고 찾으면 놓친다.
export const LEGAL_EFFECTIVE_DATE = "2026-09-07";

// 위 시행일이 아직 미확정 자리표시자임을 나타내는 플래그.
// next.config.mjs가 빌드·서버 기동 시 이 파일을 읽어 true이면 콘솔에 경고를 출력함
// (빌드를 실패시키지는 않음 — 26차 대표번호와 동일한 방식).
// 12차에 공개일이 2026-09-07로 확정되어 false로 내림.
export const LEGAL_EFFECTIVE_DATE_IS_PLACEHOLDER = false;

// ── 문서 버전 ─────────────────────────────────────────────────────────────────

// ⚠️ **다음 세션(동의 절차)에서 `agreed_policy_ver`로 저장할 값이다.**
// 개인정보처리방침과 약관은 개정 주기가 다를 수 있어 항목별로 나눠 정의함 —
// 두 문서 중 한쪽만 개정될 때 다른 쪽 동의까지 무효가 되면 안 되기 때문.
// 문서 내용을 실질적으로 바꾸면 해당 버전 문자열도 함께 올릴 것.
export const PRIVACY_POLICY_VERSION = "privacy-v1";
export const TERMS_VERSION = "terms-v1";

// ── 국외 이전(처리방침 제6조) ──────────────────────────────────────────────────

// Vercel Inc.의 개인정보 문의처. 29차·30차에는 이 실행 환경에서 vercel.com 접근이
// 차단되어(프록시 403) 확인하지 못했고, **12차에 사용자가 Vercel 공식 개인정보처리방침
// 에서 확인해 전달한 값**으로 채웠다(법인 주소가 필요해지면
// 440 N Barranca Avenue #4133, Covina, CA 91723, United States).
// ⚠️ 값이 비면 `lib/legal/privacy.ts`가 "확인 중"으로 표시한다 — 폴백은 그대로 두되
// **추측으로 다른 주소를 적지 말 것.**
export const VERCEL_PRIVACY_CONTACT = "privacy@vercel.com";
export const VERCEL_PRIVACY_CONTACT_IS_PLACEHOLDER = false;

// ── 표시용 헬퍼 ───────────────────────────────────────────────────────────────

/**
 * "2026-09-01" -> "2026년 9월 1일"
 * 법적 문서는 숫자 날짜(2026-09-01)보다 한글 표기가 관례라 화면에서는 이 형태로 보여줌.
 */
export function formatLegalDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  // 앞자리 0을 떼서 "9월 1일"로 (Number 변환이 "09" -> 9를 처리)
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export const LEGAL_EFFECTIVE_DATE_LABEL = formatLegalDate(LEGAL_EFFECTIVE_DATE);

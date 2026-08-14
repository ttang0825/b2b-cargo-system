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

// ⚠️ 자리표시자. 실제 공개일이 정해지면 이 값과 아래 플래그를 **같이** 바꿀 것.
// 약관 부칙 1곳 + 처리방침 3곳(시행일자·최종 개정일·부칙) + 이메일무단수집거부
// 게시일 1곳, 총 5곳이 이 값을 참조한다.
export const LEGAL_EFFECTIVE_DATE = "2026-09-01";

// 위 시행일이 아직 미확정 자리표시자임을 나타내는 플래그.
// next.config.mjs가 빌드·서버 기동 시 이 파일을 읽어 true이면 콘솔에 경고를 출력함
// (빌드를 실패시키지는 않음 — 26차 대표번호와 동일한 방식).
export const LEGAL_EFFECTIVE_DATE_IS_PLACEHOLDER = true;

// ── 문서 버전 ─────────────────────────────────────────────────────────────────

// ⚠️ **다음 세션(동의 절차)에서 `agreed_policy_ver`로 저장할 값이다.**
// 개인정보처리방침과 약관은 개정 주기가 다를 수 있어 항목별로 나눠 정의함 —
// 두 문서 중 한쪽만 개정될 때 다른 쪽 동의까지 무효가 되면 안 되기 때문.
// 문서 내용을 실질적으로 바꾸면 해당 버전 문자열도 함께 올릴 것.
export const PRIVACY_POLICY_VERSION = "privacy-v1";
export const TERMS_VERSION = "terms-v1";

// ── 국외 이전(처리방침 제6조) ──────────────────────────────────────────────────

// Vercel Inc.의 개인정보 문의처. 29차·30차 모두 이 실행 환경의 네트워크 정책에서
// vercel.com 접근이 차단되어(프록시 403) 실제 값을 확인하지 못함.
// **추측으로 이메일을 적지 말 것** — 사용자가 Vercel 개인정보처리방침에서 확인해
// 주면 이 값과 아래 플래그를 같이 바꾸면 됨.
export const VERCEL_PRIVACY_CONTACT = "";
export const VERCEL_PRIVACY_CONTACT_IS_PLACEHOLDER = true;

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

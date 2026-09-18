// ─────────────────────────────────────────────────────────────────────────────
// 견적관리 「전화응대 매뉴얼」 — 한 정의처 (2026-09-18)
//
// 사용자 요청: *"견적관리에서 전화응대 메뉴얼 창이 있으면 좋겠다. … 수시로 편집할수
// 있으면 좋겠다. … 줄칸을 늘릴수 있고 줄일수 있게 설정. 줄칸 앞에 넘버링만 있으면 된다"*
//
// 🔴 **전 직원이 같은 한 벌을 본다**(사용자 확정 2026-09-18) — 화면도 저장도 모두
//    `call_script` 한 행을 가리킨다. 직원별로 가르지 말 것.
// 🔴 **편집은 관리자만**이다. 화면이 버튼을 감추는 것(`getCurrentStaffRole()`)과
//    저장 API 의 `role === "admin"` 검사는 **한 벌**이다(원칙 25번) — 화면만 감추면
//    브라우저 콘솔에서 그대로 부를 수 있다.
// 🔴 **넘버링을 저장하지 않는다** — 번호는 배열 순서에서 나온다(`i + 1`). 글에 번호를
//    적어 두면 줄 하나를 지울 때마다 아래 번호를 사람이 전부 고쳐야 한다.
//
// 🔴 **이 파일에 의존성을 들이지 말 것 — 특히 `lib/supabaseClient.ts`.**
//    저장 API(`app/api/admin/call-script/route.ts`)가 여기서 `normalizeCallScriptLines`
//    를 가져다 쓰는데, 그 클라이언트는 **모듈을 읽는 순간** 브라우저 클라이언트를
//    만들어서 서버에서는 환경변수가 없다며 던진다. 실제로 한 번 넣었다가
//    `next build` 가 *"Failed to collect page data for /api/admin/call-script"* 로
//    멈췄다(PR #151 의 `lib/quoteValidity.ts` 와 같은 자리다).
//    조회는 화면(`components/CallScriptPanel.tsx`)이 직접 한다.
// ─────────────────────────────────────────────────────────────────────────────

/** 줄 수 상한. 🔴 화면이 sticky 로 따라다니므로 무한정 길어지면 안 된다. */
export const CALL_SCRIPT_MAX_LINES = 60;
/** 한 줄 길이 상한(글자). 응대 중에 눈으로 훑는 글이라 길면 제 구실을 못한다. */
export const CALL_SCRIPT_MAX_LINE_LENGTH = 200;

export type CallScript = {
  lines: string[];
  /**
   * 🔴 **덮어쓰기 경고의 기준**이다(원칙 28번과 같은 결).
   *    저장할 때 이 값을 같이 보내고, 서버가 DB 의 값과 다르면 거절한다 —
   *    두 관리자가 같은 창을 열어 두고 각자 고칠 때 **먼저 저장한 쪽이 조용히
   *    사라지는 것**을 막는다. 빼지 말 것.
   */
  updatedAt: string | null;
};

export const EMPTY_CALL_SCRIPT: CallScript = { lines: [], updatedAt: null };

/**
 * 저장 전에 줄 목록을 다듬는다 — **화면과 서버가 같은 함수를 쓴다.**
 *
 * 🔴 양쪽이 각자 다듬으면 화면에 보이던 것과 저장된 것이 갈린다.
 * - 앞뒤 공백을 떼고
 * - 빈 줄은 버린다(줄을 더했다가 안 적고 저장한 경우)
 * - 길이·줄 수 상한으로 자른다
 */
export function normalizeCallScriptLines(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, CALL_SCRIPT_MAX_LINE_LENGTH))
    .filter((v) => v.length > 0)
    .slice(0, CALL_SCRIPT_MAX_LINES);
}

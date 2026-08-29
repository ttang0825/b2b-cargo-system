/**
 * 화주 「견적 승인」 흔적 — 관리자 화면 표기의 유일 정의처.
 *
 * 🔴 **`approved_by_customer_at` 이 있으면 화주가 포털에서 직접 승인한 건이고, `null`
 *    이면 담당자가 손으로 `수주` 로 바꾼 건이다**(2026-08-29 마이그레이션).
 *    27차까지는 둘이 DB 상 구분되지 않아서, 담당자가 「이 건은 화주가 승인한 것인가,
 *    내가 바꾼 것인가」를 되짚을 방법이 없었다(28차 §5-1).
 *
 * 🔴 **`TopNav` 배지를 이 값으로 쪼개지 말 것.** 배지는 「오더를 만들어야 하는 건」의
 *    개수이고, 화주가 승인했든 담당자가 바꿨든 **할 일은 똑같다.** 둘로 나누면 담당자가
 *    어느 쪽을 먼저 볼지 헷갈리고 합계를 다시 머릿속으로 더해야 한다.
 *
 * ⚠️ **과거 건은 전부 `null` 이다** — 마이그레이션이 기존 행을 채우지 않았다(채우면
 *    화주가 승인한 적 없는 건이 화주 승인으로 둔갑한다). 그래서 이 표기가 없다고 해서
 *    「화주가 승인하지 않았다」로 읽으면 안 되고, **2026-08-29 이후 건에만 유효하다.**
 */
export const CUSTOMER_APPROVED_LABEL = "화주 승인";

/** 승인 시각 — 목록에 들어가야 해서 짧게(`8/29 16:20`). 시각을 보는 사람의 로컬 TZ 기준. */
export function formatCustomerApprovedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

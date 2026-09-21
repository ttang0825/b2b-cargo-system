// 「적립 현황 안내」 문자 미리보기를 받아오는 **유일한 브라우저 쪽 통로**
// (3차 후속, 2026-09-21)
//
// 🔴 **부르는 곳이 셋이라 여기 하나로 모은다**(원칙 53번 — 38차 웹 푸시·PR #154
//    자동 담기와 같은 자리):
//
//      components/CompanyRewardPanel.tsx    수동 「적립 안내 문자」
//      app/admin/dispatches/[id]/page.tsx   운송완료 (상세)
//      app/admin/dispatches/page.tsx        운송완료 (목록)
//
//    🔴 화면마다 `fetch` 를 적으면 **한쪽만 고쳐진다**(목록에서 바꾸면 안 뜨고
//       상세에서 바꾸면 뜨는 상태가 실제로 이 저장소에서 여러 번 났다).
//
// 🔴 **던지지 않는다.** 미리보기를 못 받아도 상태 변경·저장은 이미 끝난 일이다.
//    못 받으면 `null` 이고, 호출부가 그때 무엇을 할지 정한다.

import type { SmsPreview } from "@/components/SmsConfirmModal";

export async function fetchRewardStatusSmsPreview(opts: {
  /** 수동 — 화주 상세에서 부를 때 */
  companyId?: string | null;
  /**
   * 운송완료 — 🔴 **화주도 정산 건도 서버가 다시 조회한다**(원칙 53번).
   *    그래서 배차 화면은 배차 id 하나만 넘기면 된다.
   */
  dispatchId?: string | null;
}): Promise<SmsPreview | null> {
  if (!opts.companyId && !opts.dispatchId) return null;
  try {
    const res = await fetch("/api/admin/reward/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id: opts.companyId ?? null,
        dispatch_id: opts.dispatchId ?? null,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return json.preview ?? null;
  } catch {
    return null;
  }
}

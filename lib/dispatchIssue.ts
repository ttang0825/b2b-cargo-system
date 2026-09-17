// ─────────────────────────────────────────────────────────────────────────────
// 문제발생 사유 — **유일 정의처** (2026-09-17)
//
// 배경(사용자): *「운행중 사고가 났을시 어떻게 해야하나? 배차상태에 "문제발생" 이
// 있긴 한데 화주포털에 노출시 문제발생으로만 뜨고 화주입장에서는 어떤 상황인지
// 잘모르게 된다. 문제 발생 경우를 간단하게 설명하는 드롭다운 메뉴가 있어야 하지 않나?」*
//
// 그전에는 관리자에 **체크박스 + 자유 서술**만 있었고, 화주에게는 **빨간 배지 하나**가
// 갔다(`issue_notes` 는 안 갔다 — 내부 메모이고 지금도 안 간다).
//
// 🔴 **관리자 라벨과 화주 라벨이 다르다**(§5-4 패턴 — `lib/quoteStatusLabels.ts` 와 같은 결).
//    담당자에게는 정확한 말이 필요하고, 화주 화면에는 **단정 표현과 책임 인정**을 넣을 수
//    없다. 약관 제19조가 배상책임을 **차주와 그 보험자**에게 두는데 화면이 회사의 책임을
//    시사하면 그 조항과 어긋난다.
//
// 🚨 **`lost` 의 화주 라벨에 「분실」을 쓰지 말 것.**
//    보험 약관이 **도난신고 없는 망실을 전부 「분실」로 간주해 면책**한다. 화주 화면에
//    그 낱말이 뜨면 **보험이 안 나오는 바로 그 경우를 회사가 스스로 적은 것**이 된다.
//    「없어졌습니다」도 같은 이유로 피하고 **상태 서술**(「화물 확인 중」)로 쓴다.
//    🔴 이 금지는 **공개 화면뿐 아니라 화주포털에도 걸린다.**
//
// ⚠️ **라벨은 확정이 아니다** — 변호사 검수 항목이고 실무 확인 대상이다(§7).
//
// 🔴 **DB 에 CHECK 를 걸지 않았다** — 사유 목록은 실무가 굳기 전이라 늘어난다.
//    이 파일이 유일한 방어선이고, 화면에서 코드 문자열을 직접 적지 말 것.
// ─────────────────────────────────────────────────────────────────────────────

export type DispatchIssueReasonCode =
  | "delay"
  | "damage"
  | "lost"
  | "accident"
  | "wrong_delivery"
  | "refused"
  | "vehicle_trouble"
  | "etc";

export type DispatchIssueReason = {
  code: DispatchIssueReasonCode;
  /** 담당자가 보는 정확한 말. */
  adminLabel: string;
  /**
   * 화주가 보는 말.
   * 🔴 **단정·책임 인정 금지** — 「파손됐습니다」가 아니라 「화물 손상」이다.
   * 🚨 **「분실」·「없어졌」을 쓰지 말 것**(위 참고).
   */
  customerLabel: string;
  /** 🔴 관리자 화면에 사고 체크리스트를 띄울 사유인가(`lib/incidentGuide.ts`). */
  needsGuide: boolean;
};

/** 🔴 배열 순서가 곧 드롭다운 순서다 — 가벼운 것부터. */
export const DISPATCH_ISSUE_REASONS: DispatchIssueReason[] = [
  { code: "delay",           adminLabel: "지연",      customerLabel: "도착 지연",      needsGuide: false },
  { code: "damage",          adminLabel: "파손",      customerLabel: "화물 손상",      needsGuide: true  },
  // 🚨 화주 라벨이 「화물 확인 중」인 이유는 위 경고를 볼 것. 바꾸지 말 것.
  { code: "lost",            adminLabel: "화물 없어짐", customerLabel: "화물 확인 중",  needsGuide: true  },
  { code: "accident",        adminLabel: "차량 사고",  customerLabel: "운송 중 사고",   needsGuide: true  },
  { code: "wrong_delivery",  adminLabel: "오배송",     customerLabel: "배송지 착오",    needsGuide: false },
  { code: "refused",         adminLabel: "인수 거부",  customerLabel: "하차지 인수 보류", needsGuide: false },
  { code: "vehicle_trouble", adminLabel: "차량 고장",  customerLabel: "차량 문제",      needsGuide: false },
  { code: "etc",             adminLabel: "기타",      customerLabel: "확인 중",        needsGuide: false },
];

export function getDispatchIssueReason(
  code: string | null | undefined
): DispatchIssueReason | null {
  if (!code) return null;
  return DISPATCH_ISSUE_REASONS.find((r) => r.code === code) || null;
}

/** 담당자 화면용. 모르는 코드는 **코드를 그대로** 보여준다(조용히 비우지 않는다 · 원칙 55번). */
export function dispatchIssueAdminLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return getDispatchIssueReason(code)?.adminLabel || code;
}

/**
 * 화주 화면용.
 * 🔴 모르는 코드는 **「확인 중」으로 떨어뜨린다** — 담당자 화면과 달리 여기서
 *    코드(`lost`)나 관리자 라벨(「화물 없어짐」)이 새어 나가면 안 된다.
 * 🔴 사유가 **없으면 빈 문자열**이다 — 호출부가 「배지만 그린다」를 고를 수 있어야 한다
 *    (사유를 안 적은 옛 건에 「확인 중」을 지어내지 않는다).
 */
export function dispatchIssueCustomerLabel(code: string | null | undefined): string {
  if (!code) return "";
  return getDispatchIssueReason(code)?.customerLabel || "확인 중";
}

export function dispatchIssueNeedsGuide(code: string | null | undefined): boolean {
  return getDispatchIssueReason(code)?.needsGuide === true;
}

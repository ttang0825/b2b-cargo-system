import {
  isRecurringContractActive,
  RECURRING_CONTRACT_BADGE_LABEL,
} from "@/lib/companyFields";

// 「정기계약」 배지 — 33차 A장.
//
// 🔴 **문구는 `RECURRING_CONTRACT_BADGE_LABEL` 하나다** — 「정기」·「계약화주」 같은
//    변형을 만들지 말 것. 목록·상세·견적·오더·배차가 같은 말을 써야 담당자가 같은
//    것으로 읽는다.
// 🔴 **종료일이 지난 계약에는 붙지 않는다**(`isRecurringContractActive`) — 체크는
//    기록으로 남지만, 안 그러면 끝난 계약의 배지가 목록에 영원히 남는다.
//    「체크가 켜져 있는데 왜 배지가 없지」는 **의도된 동작**이다.
// 🔴 **화주에게는 보이지 않는다** — 이 컴포넌트를 `app/customer/**` 나 견적서·엑셀에
//    쓰지 말 것. 정기계약은 배차 담당자가 우선순위를 판단하는 내부 정보다.

type Props = {
  company?: {
    is_recurring_contract?: boolean | null;
    recurring_contract_ended_on?: string | null;
  } | null;
  /** 목록 표처럼 좁은 칸에서 쓰는 작은 크기 */
  small?: boolean;
  /**
   * 회사명 **위 줄**에 얹는다(목록 표 기본).
   * 🔴 호출부에서 `<div>` 로 감싸 올리지 말 것 — 배지가 안 붙는 화주는 이 컴포넌트가
   *    `null` 을 돌려주는데, 바깥 `<div>` 는 그대로 남아 **빈 줄로 칸이 벌어진다.**
   *    그래서 감싸는 일까지 이 컴포넌트가 한다.
   */
  block?: boolean;
};

export default function RecurringContractBadge({ company, small, block }: Props) {
  if (!company || !isRecurringContractActive(company)) return null;
  return (
    <span
      style={{
        // 🔴 `block` 이면 회사명 위 줄에 얹는다 — 이름 옆에 붙이면 이름 칸이 그만큼
        //    넓어져 목록의 다른 칸을 민다(`cell-nowrap` 칸이라 줄바꿈도 안 된다).
        display: block ? "block" : "inline-block",
        width: block ? "fit-content" : undefined,
        marginBottom: block ? 2 : undefined,
        padding: small ? "1px 5px" : "2px 7px",
        borderRadius: 4,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        background: "#E0E7FF",
        color: "#4338CA",
        verticalAlign: block ? undefined : "middle",
      }}
      title="정기 운송 계약이 있는 화주입니다"
    >
      {RECURRING_CONTRACT_BADGE_LABEL}
    </span>
  );
}

"use client";

import { MixedLoadingDiscountTierRow } from "@/lib/mixedLoadingDiscountSettings";

// 혼적 할인율 입력창 옆에 그 거리 구간의 표준값을 보조로 띄운다.
// 🔴 순수 표시다 — 저장·제출에 전혀 관여하지 않는다(PR #120 "불러온 프리셋 이름
//    표시"와 같은 결). 담당자가 표준과 다른 값을 넣는 것을 막지 않고, 다르다는
//    사실만 보이게 한다.
// 🔴 거리를 모르면(운송오더 상세처럼 distance_km 컬럼 자체가 없는 화면) tier 가
//    null 로 들어와 아무것도 그리지 않는다 — 임의의 구간을 골라 보여주면 담당자가
//    그 값을 표준으로 믿게 된다.
export default function MixedDiscountStandardHint({
  tier,
  currentValue,
}: {
  tier: MixedLoadingDiscountTierRow | null;
  currentValue: string;
}) {
  if (!tier) return null;
  const std = tier.standard_discount_percent;
  const entered = currentValue.trim() === "" ? null : Number(currentValue);
  const differs = entered != null && Number.isFinite(entered) && entered !== std;

  return (
    <span
      style={{
        display: "block",
        marginTop: 6,
        fontSize: 12,
        color: "var(--text-muted)",
        wordBreak: "keep-all",
      }}
    >
      표준 {std}% ({tier.distance_label})
      {differs && (
        <span style={{ color: "var(--accent)", marginLeft: 6 }}>· 표준과 다름</span>
      )}
    </span>
  );
}

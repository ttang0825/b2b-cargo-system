"use client";

// 로드맵 ②-A 신규 정산방식 입력 — 수금방식(collection_method)+청구주기(billing_cycle)
// +지급조건(direct_collection_point) 3종을 한 묶음으로 입력받는 공용 컴포넌트.
// 견적/운송오더 등록·수정 화면에서 재사용(원칙 12·37번과 같은 공용화 패턴).
const CHECKBOX_STYLE: React.CSSProperties = { width: "auto", flexShrink: 0 };

export type CollectionMethodValue = {
  collection_method: "broker" | "driver_direct";
  billing_cycle: "per_order" | "monthly";
  direct_collection_point: "pickup" | "dropoff" | "undecided" | null;
};

/**
 * 🔴 36차 A·B장 — 화주 계약의 청구주기(`companies.billing_cycle_default`)와 **다르면**
 *    담당자에게 알린다.
 *
 *    안 알리면 담당자가 모르고 지나가고, **화주는 요청했다고 생각하는데 정산은
 *    계약대로 나간다**(B장이 막으려는 것이 정확히 이 자리다).
 *
 * 🔴 **막지 않는다 — 알리기만 한다.** 화주 값은 「기본값(제안)」이고 이 건의 값이
 *    진실이다. 막으면 계약과 다르게 합의한 건을 아예 못 넣는다.
 * 🔴 **되돌려 채우지 말 것**(원칙 45번) — 이 건의 값을 화주 계약으로 동기화하면
 *    어느 쪽이 진짜인지 알 수 없어진다.
 * ⚠️ 계약이 「미정」(null)이면 비교 대상이 없으므로 아무것도 그리지 않는다 —
 *    「안 정했다」를 「건별로 정했다」로 바꿔 읽으면 안 된다.
 */
const CONTRACT_MISMATCH_LABEL = "계약과 다름";

export default function CollectionMethodInput({
  value,
  onChange,
  namePrefix,
  contractBillingCycle,
}: {
  value: CollectionMethodValue;
  onChange: (next: CollectionMethodValue) => void;
  namePrefix: string;
  /** 이 화주의 계약 청구주기. 없으면(개인·신규 고객, 미정) 비교하지 않는다 */
  contractBillingCycle?: string | null;
}) {
  const contractLabel =
    contractBillingCycle === "monthly"
      ? "월정산"
      : contractBillingCycle === "per_order"
      ? "건별"
      : null;
  const mismatch = contractLabel !== null && contractBillingCycle !== value.billing_cycle;
  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>정산방식</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <input
            type="radio"
            name={`${namePrefix}_collection_method`}
            style={CHECKBOX_STYLE}
            checked={value.collection_method === "broker"}
            onChange={() =>
              onChange({ ...value, collection_method: "broker", direct_collection_point: null })
            }
          />
          주선사 정산(WeCarry가 수금·지급)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <input
            type="radio"
            name={`${namePrefix}_collection_method`}
            style={CHECKBOX_STYLE}
            checked={value.collection_method === "driver_direct"}
            onChange={() =>
              onChange({
                ...value,
                collection_method: "driver_direct",
                direct_collection_point: value.direct_collection_point || "undecided",
              })
            }
          />
          선착불(차주 직접수금)
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, marginBottom: value.collection_method === "driver_direct" ? 8 : 0 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <input
            type="radio"
            name={`${namePrefix}_billing_cycle`}
            style={CHECKBOX_STYLE}
            checked={value.billing_cycle === "per_order"}
            onChange={() => onChange({ ...value, billing_cycle: "per_order" })}
          />
          건별 청구
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <input
            type="radio"
            name={`${namePrefix}_billing_cycle`}
            style={CHECKBOX_STYLE}
            checked={value.billing_cycle === "monthly"}
            onChange={() => onChange({ ...value, billing_cycle: "monthly" })}
          />
          월정산(수수료 월단위 청구)
        </label>
        {mismatch && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#FEF3C7",
              color: "#92400E",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
            title={`이 화주의 계약 청구주기는 「${contractLabel}」입니다`}
          >
            {CONTRACT_MISMATCH_LABEL}
            <span style={{ fontWeight: 400 }}>(계약: {contractLabel})</span>
          </span>
        )}
      </div>

      {value.collection_method === "driver_direct" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <input
              type="radio"
              name={`${namePrefix}_direct_collection_point`}
              style={CHECKBOX_STYLE}
              checked={value.direct_collection_point === "pickup"}
              onChange={() => onChange({ ...value, direct_collection_point: "pickup" })}
            />
            선불(상차지 지급)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <input
              type="radio"
              name={`${namePrefix}_direct_collection_point`}
              style={CHECKBOX_STYLE}
              checked={value.direct_collection_point === "dropoff"}
              onChange={() => onChange({ ...value, direct_collection_point: "dropoff" })}
            />
            착불(하차지 지급)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <input
              type="radio"
              name={`${namePrefix}_direct_collection_point`}
              style={CHECKBOX_STYLE}
              checked={value.direct_collection_point === "undecided"}
              onChange={() => onChange({ ...value, direct_collection_point: "undecided" })}
            />
            협의중
          </label>
        </div>
      )}
    </div>
  );
}

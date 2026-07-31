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

export default function CollectionMethodInput({
  value,
  onChange,
  namePrefix,
}: {
  value: CollectionMethodValue;
  onChange: (next: CollectionMethodValue) => void;
  namePrefix: string;
}) {
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

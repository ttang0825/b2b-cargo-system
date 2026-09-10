"use client";

import { memo } from "react";
import AddressSearch from "@/components/AddressSearch";
import MultiSelectTags from "@/components/MultiSelectTags";
import { formatPhoneNumber, VEHICLE_TYPES_ALL, BODY_TYPES, REGIONS } from "@/lib/constants";
import type { CompanyField } from "@/lib/companyFields";

// 화주 항목 하나를 그리는 공용 입력칸 — 33차 A장.
//
// 🔴 **신규 등록 폼과 상세 수정 폼이 이 컴포넌트 하나를 쓴다.** 화면마다 같은 항목을
//    각자 그리고 있던 것이 항목이 갈린 원인이었다(등록 25개 · 수정 54개). 위젯 종류는
//    `lib/companyFields.ts` 의 `type` 이 정하고, 화면은 필드 배열을 돌리기만 한다.
//
// 🔴 여기에 필드별 `if (key === "...")` 분기를 만들지 말 것 — 그러면 정의 파일이 아니라
//    이 파일이 두 번째 정의처가 된다. 특별한 취급이 필요하면 `type` 을 새로 만든다.

type Props = {
  field: CompanyField;
  /**
   * 🔴 **폼 state 전체를 넘기지 말 것.** 그 필드가 실제로 쓰는 값만 받는다 —
   *    `form` 객체를 통째로 넘기면 한 칸만 고쳐도 참조가 바뀌어 `React.memo` 가
   *    무력해지고 **입력칸 51개가 전부 다시 그려진다.** 실사용 리뷰 1라운드의
   *    「펼치고 닫을 때 버벅거림」이 그것이었다(CPU 6배에서 218~238ms).
   */
  value: any;
  /** `address` 전용 — 상세주소 칸 */
  detailValue?: string;
  /** `vehicle` 전용 — 톤수·형태 두 칸 */
  tonnage?: string;
  bodytype?: string;
  onChange: (key: string, value: any) => void;
  /** 주소 검색이 sido/sigungu 를 함께 돌려줄 때 저장할 컬럼 접두어 */
  onAddressChange?: (key: string, addr: string, sido: string, sigungu: string) => void;
  disabled?: boolean;
};

/** 사업자등록번호 자동 하이픈 — 000-00-00000 */
function formatBizRegNo(v: string) {
  const d = v.replace(/[^0-9]/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function CompanyFieldInput({
  field,
  value,
  detailValue,
  tonnage,
  bodytype,
  onChange,
  onAddressChange,
  disabled,
}: Props) {
  const f = field;

  // ── 주소 ─────────────────────────────────────────────────────────────────
  // 🔴 원칙 37번 — 주소는 예외 없이 AddressSearch 를 재사용한다. 상세주소는 별도
  //    컬럼을 만들지 않고 저장 직전에 도로명주소와 합친다(fullOrigin 패턴).
  if (f.type === "address") {
    return (
      <AddressSearch
        label={f.label}
        value={value || ""}
        detailValue={detailValue || ""}
        onChange={(addr, sido, sigungu) =>
          onAddressChange
            ? onAddressChange(f.key, addr, sido, sigungu)
            : onChange(f.key, addr)
        }
        onDetailChange={(v) => onChange(`${f.key}Detail`, v)}
      />
    );
  }

  // ── 지역 중복 선택 ────────────────────────────────────────────────────────
  if (f.type === "region-multi") {
    return (
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label>
          {f.label} (중복 선택 가능)
        </label>
        <MultiSelectTags
          options={REGIONS as unknown as string[]}
          value={value || ""}
          onChange={(v) => onChange(f.key, v)}
        />
      </div>
    );
  }

  // ── 추천 차량(톤수 + 형태 → 한 컬럼) ──────────────────────────────────────
  if (f.type === "vehicle") {
    return (
      <div className="field">
        <label>{f.label}</label>
        <div style={{ display: "flex", gap: 6 }}>
          <select
            value={tonnage || VEHICLE_TYPES_ALL[0]}
            onChange={(e) => onChange("recommended_vehicle_tonnage", e.target.value)}
            disabled={disabled}
            style={{ flex: 1, minWidth: 0 }}
          >
            {VEHICLE_TYPES_ALL.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={bodytype || BODY_TYPES[0]}
            onChange={(e) => onChange("recommended_vehicle_bodytype", e.target.value)}
            disabled={disabled}
            style={{ flex: 1, minWidth: 0 }}
          >
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // ── 체크박스 ──────────────────────────────────────────────────────────────
  if (f.type === "checkbox") {
    return (
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(f.key, e.target.checked)}
            disabled={disabled}
            style={{ width: 16, height: 16, margin: 0 }}
          />
          {f.label}
        </label>
        {f.note && <FieldNote text={f.note} />}
      </div>
    );
  }

  // ── 드롭다운 ──────────────────────────────────────────────────────────────
  if (f.type === "select") {
    return (
      <div className="field">
        <label>
          {f.label}
          {f.required && " *"}
        </label>
        <select
          value={value || ""}
          onChange={(e) => onChange(f.key, e.target.value)}
          disabled={disabled}
        >
          <option value="">선택</option>
          {(f.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {f.note && <FieldNote text={f.note} />}
      </div>
    );
  }

  // ── 여러 줄 ───────────────────────────────────────────────────────────────
  if (f.type === "textarea") {
    return (
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label>{f.label}</label>
        <textarea
          value={value || ""}
          onChange={(e) => onChange(f.key, e.target.value)}
          rows={3}
          disabled={disabled}
          placeholder={f.placeholder}
        />
        {f.note && <FieldNote text={f.note} />}
      </div>
    );
  }

  // ── 한 줄 입력 (text · tel · email · url · date · number · biz-reg) ───────
  // 🔴 전화번호는 예외 없이 formatPhoneNumber 를 물린다(원칙 35번).
  const handleText = (raw: string) => {
    if (f.type === "tel") return onChange(f.key, formatPhoneNumber(raw));
    if (f.type === "biz-reg") return onChange(f.key, formatBizRegNo(raw));
    return onChange(f.key, raw);
  };

  const inputType =
    f.type === "date" ? "date" : f.type === "number" ? "number" : f.type === "email" ? "email" : "text";

  return (
    <div className="field">
      <label>
        {f.label}
        {f.required && " *"}
      </label>
      <input
        type={inputType}
        value={value ?? ""}
        onChange={(e) => handleText(e.target.value)}
        disabled={disabled}
        placeholder={f.placeholder}
        // 🔴 주소검색으로 채워지는 칸은 아니지만, 브라우저 자동완성이 뜨면 테두리가
        //    깨지는 버그가 있었다(원칙 17번). 사업자번호·전화번호에도 같이 끈다.
        autoComplete="off"
        inputMode={f.type === "tel" || f.type === "biz-reg" ? "numeric" : undefined}
      />
      {f.note && <FieldNote text={f.note} />}
    </div>
  );
}

/**
 * 🔴 `React.memo` 를 벗기지 말 것 — 구획을 펼치고 닫을 때 값이 안 바뀐 입력칸까지
 *    전부 다시 그려져 버벅거린다. 이것이 먹으려면 위의 「값만 받는다」와
 *    화면 쪽의 `useCallback` 이 **한 벌로** 지켜져야 한다(하나만 어겨도 무력해진다).
 */
export default memo(CompanyFieldInput);

function FieldNote({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{text}</div>
  );
}

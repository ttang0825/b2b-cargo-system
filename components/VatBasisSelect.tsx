"use client";

// 금액이 「부가세 별도(공급가액)」인지 「부가세 포함」인지 고르는 공용 컨트롤 (35차 A-3).
//
// 🔴 **화주 청구금액과 차주 지급금액이 같은 부품을 쓴다** — 두 벌이 되면 갈린다
//    (완료조건 9). 새로 만들지 말고 이것을 가져다 쓸 것.
//
// 🔴 **기본값은 false = 부가세 별도**다. 7차 세션에 이 토글을 지우면서 저장된 모든
//    금액을 공급가액으로 고정했기 때문에, true 를 기본으로 두면 **과거 데이터의 의미가
//    통째로 바뀐다**(마진이 10% 작게 잡힌다).
//
// 🔴 `.pv2-*` 를 쓰지 않는다 — 그 토큰은 `.portal-v2` 스코프 안에만 있어서 관리자에서는
//    색이 안 나온다(PR #145 에서 실측). 관리자 기존 어휘만 쓴다.

export default function VatBasisSelect({
  value,
  onChange,
  disabled,
}: {
  /** true = 부가세 포함 · false = 부가세 별도(공급가액) */
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ? "included" : "excluded"}
      onChange={(e) => onChange(e.target.value === "included")}
      disabled={disabled}
      style={{ fontSize: 12.5 }}
    >
      <option value="excluded">부가세 별도</option>
      <option value="included">부가세 포함</option>
    </select>
  );
}

/** 화면에 캡션으로 적을 때 쓰는 라벨 — 문자열을 화면마다 다시 적지 말 것 */
export function vatBasisLabel(vatIncluded: boolean | null | undefined): string {
  return vatIncluded ? "부가세 포함" : "부가세 별도";
}

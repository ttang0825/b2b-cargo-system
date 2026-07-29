"use client";

// 금액 입력창 — 값 자체는 부모가 순수 숫자 문자열로 관리하고, 화면에는
// 1,000단위 콤마를 붙여 보여준다. <input type="number">는 콤마를 표시할 수
// 없어서 type="text" + inputMode="numeric"으로 구현.
export default function MoneyInput({
  value,
  onChange,
  placeholder,
  style,
  disabled,
}: {
  value: string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const numeric = value === "" ? null : Number(value);
  const display = numeric === null || Number.isNaN(numeric) ? "" : numeric.toLocaleString("ko-KR");

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
    />
  );
}

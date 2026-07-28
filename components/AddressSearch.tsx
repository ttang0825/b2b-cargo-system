"use client";

import { ReactNode } from "react";
import { useDaumPostcode } from "@/lib/useDaumPostcode";

type AddressSearchProps = {
  label: string;
  required?: boolean;
  value: string;
  detailValue: string;
  onChange: (address: string, sido: string, sigungu: string) => void;
  onDetailChange: (detail: string) => void;
  placeholder?: string;
  detailPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
  /** 저장된 주소 뱃지 등, 입력창 아래에 추가로 보여줄 내용 */
  children?: ReactNode;
};

// 시스템 전체 공용 주소입력: 도로명주소 검색 + 상세주소.
// 다음 주소검색으로 채운 경우 sido/sigungu도 함께 전달하고 상세주소는 초기화됨(원래
// 화면들의 기존 동작과 동일). 직접 타이핑한 경우엔 sido/sigungu를 알 수 없으므로 비움.
export default function AddressSearch({
  label,
  required,
  value,
  detailValue,
  onChange,
  onDetailChange,
  placeholder = "도로명주소 검색 또는 직접 입력",
  detailPlaceholder = "상세주소 (선택)",
  className = "field",
  style,
  children,
}: AddressSearchProps) {
  const { ready, open } = useDaumPostcode();

  function handleSearch() {
    open((data) => {
      const addr = data.roadAddress || data.jibunAddress;
      onChange(addr, data.sido || "", data.sigungu || "");
      onDetailChange("");
    });
  }

  return (
    <div className={className} style={style}>
      <label>
        {label}
        {required ? " *" : ""}
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value, "", "")}
          placeholder={placeholder}
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn-ghost"
          style={{
            padding: "0 10px",
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
          onClick={handleSearch}
          disabled={!ready}
        >
          주소검색
        </button>
      </div>
      <input
        value={detailValue}
        onChange={(e) => onDetailChange(e.target.value)}
        placeholder={detailPlaceholder}
        style={{ marginTop: 6 }}
      />
      {children}
    </div>
  );
}

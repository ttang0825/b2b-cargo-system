"use client";

// 상·하차지 현장 정보 공용 입력 — 견적/오더/배차 **여섯 화면**이 같이 쓴다.
//
// 🔴 **담당자 연락처는 일부러 선택이다**(34차, 사용자 확정 — 여섯 화면 전부).
//    모르는 채로 견적을 못 내는 것이 실제 업무를 막고 있었다. 「필수인데 빠졌다」로
//    되돌리지 말 것 — 각 화면의 제출 검증에서도 같이 풀었다.
// 🟢 이 번호는 **SMS 수신번호가 아니다**(실측 — `sendSms` 는 화주/차주 번호를 쓴다).
//    비어도 문자 발송이 조용히 실패하지 않는다.

import { formatPhoneNumber } from "@/lib/constants";

export type PickupDropoffContactValue = {
  origin_company_name: string;
  origin_contact_name: string;
  origin_contact_phone: string;
  destination_company_name: string;
  destination_contact_name: string;
  destination_contact_phone: string;
};

export const EMPTY_PICKUP_DROPOFF_CONTACT: PickupDropoffContactValue = {
  origin_company_name: "",
  origin_contact_name: "",
  origin_contact_phone: "",
  destination_company_name: "",
  destination_contact_name: "",
  destination_contact_phone: "",
};

type Props = {
  value: PickupDropoffContactValue;
  onChange: (patch: Partial<PickupDropoffContactValue>) => void;
  disabled?: boolean;
  /**
   * 한 쪽만 그린다 — 견적 등록 폼이 **출발지 열 / 도착지 열**로 좌우를 가르기 위해 쓴다
   * (34차 리뷰 2라운드: *"견적관리에서 정보창 레이아웃을 화주포탈 발주요청과 거의
   * 유사하게 구성해줘"*). 화주포털 발주요청이 그 모양이다.
   *
   * 🔴 **주지 않으면 지금까지와 똑같이 여섯 칸을 그대로 내놓는다** — 나머지 다섯 화면
   *    (오더 등록·상세 · 배차 등록·상세 · 화주요청)은 한 줄도 안 바뀐다.
   * 🔴 이 모드는 **자기 레이아웃을 스스로 그린다**(상호·담당자명 2열 + 연락처 한 줄).
   *    바깥에서 `.form-grid` 칸에 맡기면 연락처가 반 칸에 눌리거나, `grid-column`
   *    span 을 컴포넌트에 심으면 **다섯 화면의 배치가 같이 망가진다.**
   */
  only?: "pickup" | "dropoff";
};

// 상차지/하차지 상호·담당자명·연락처 6개 입력을 공용화(원칙 12·37번과 동일한
// 공용 컴포넌트화 패턴). 연락처만 필수, 나머지는 선택. 견적/운송오더/배차/
// 화주포털 발주요청 4곳에서 재사용.
export default function PickupDropoffContactFields({
  value,
  onChange,
  disabled,
  only,
}: Props) {
  if (only) {
    const isPickup = only === "pickup";
    const side = isPickup ? "상차지" : "하차지";
    const nameKey = isPickup ? "origin_company_name" : "destination_company_name";
    const personKey = isPickup ? "origin_contact_name" : "destination_contact_name";
    const phoneKey = isPickup ? "origin_contact_phone" : "destination_contact_phone";
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field">
            <label>{side} 상호 (선택)</label>
            <input
              value={value[nameKey]}
              onChange={(e) => onChange({ [nameKey]: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="field">
            <label>{side} 담당자명 (선택)</label>
            <input
              value={value[personKey]}
              onChange={(e) => onChange({ [personKey]: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="field">
          <label>{side} 담당자 연락처 (선택)</label>
          <input
            value={value[phoneKey]}
            onChange={(e) => onChange({ [phoneKey]: formatPhoneNumber(e.target.value) })}
            placeholder="010-0000-0000"
            disabled={disabled}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="field">
        <label>상차지 상호 (선택)</label>
        <input
          value={value.origin_company_name}
          onChange={(e) => onChange({ origin_company_name: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>상차지 담당자명 (선택)</label>
        <input
          value={value.origin_contact_name}
          onChange={(e) => onChange({ origin_contact_name: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>상차지 담당자 연락처 (선택)</label>
        <input
          value={value.origin_contact_phone}
          onChange={(e) => onChange({ origin_contact_phone: formatPhoneNumber(e.target.value) })}
          placeholder="010-0000-0000"
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>하차지 상호 (선택)</label>
        <input
          value={value.destination_company_name}
          onChange={(e) => onChange({ destination_company_name: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>하차지 담당자명 (선택)</label>
        <input
          value={value.destination_contact_name}
          onChange={(e) => onChange({ destination_contact_name: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>하차지 담당자 연락처 (선택)</label>
        <input
          value={value.destination_contact_phone}
          onChange={(e) => onChange({ destination_contact_phone: formatPhoneNumber(e.target.value) })}
          placeholder="010-0000-0000"
          disabled={disabled}
        />
      </div>
    </>
  );
}

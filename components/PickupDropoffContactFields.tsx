"use client";

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
};

// 상차지/하차지 상호·담당자명·연락처 6개 입력을 공용화(원칙 12·37번과 동일한
// 공용 컴포넌트화 패턴). 연락처만 필수, 나머지는 선택. 견적/운송오더/배차/
// 화주포털 발주요청 4곳에서 재사용.
export default function PickupDropoffContactFields({ value, onChange, disabled }: Props) {
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
        <label>상차지 담당자 연락처 *</label>
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
        <label>하차지 담당자 연락처 *</label>
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

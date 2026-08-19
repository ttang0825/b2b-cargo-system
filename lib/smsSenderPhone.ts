import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

// SMS 발신번호 결정 로직의 유일 정의처(35차, 10차 지시서 3장).
//
// 고객이 문자를 받고 회신할 때 **보낸 담당자에게 직접 닿게** 하는 것이 목적이다.
// 그래서 발신번호와 본문 안내번호를 둘 다 로그인한 담당자의 번호로 맞춘다.
//
// 🔴 **클라이언트가 보낸 발신번호를 절대 신뢰하지 말 것.** 항상 서버에서
// 세션 → staff_accounts 조회로 결정한다(원칙 30번과 같은 결 — 대상 식별자를
// 클라이언트 입력값으로 받지 않는다). 발신번호는 솔라피에 사전 등록된 번호만
// 유효하므로, 임의 번호를 받아 그대로 쓰면 발송이 깨지거나 사칭이 가능해진다.
//
// ⚠️ 이 모듈은 service role 키를 쓰므로 **서버(API 라우트)에서만** import할 것.

/** 저장·발송용: 숫자만 남긴다 */
export function toDigits(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

/**
 * 표시·문자 본문용: 하이픈을 붙인다.
 * 견적안내가 LMS로 바뀌면서 byte 제약이 사라졌고(지시서 4-8), 고객이 눈으로 읽고
 * 저장하기엔 하이픈이 있는 편이 낫다.
 */
export function formatSenderPhone(phone: string | null | undefined): string {
  const d = toDigits(phone);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) {
    return d.startsWith("02")
      ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
      : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone || "";
}

/** 숫자 10~11자리만 허용(관리 화면 저장 시 검증에도 같이 씀) */
export function isValidSenderPhone(phone: string): boolean {
  const d = toDigits(phone);
  return d.length === 10 || d.length === 11;
}

export type ResolvedSender = {
  /** 실제 발송에 쓸 번호(숫자만). 담당자 번호가 없으면 대표 발신번호 */
  phone: string;
  /** 화면·본문 표시용(하이픈) */
  display: string;
  /** 발송자 이름 — 본문 "(담당 홍길동)"과 모달 표시에 씀 */
  staffName: string | null;
  /** 담당자 번호가 등록되어 있어서 그걸 쓰는 경우 true */
  isStaffPhone: boolean;
  /** 대표 발신번호(fallback 대상, 숫자만). 미설정이면 빈 문자열 */
  fallbackPhone: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 지금 로그인한 직원 기준으로 발신번호를 정한다.
 *
 * 우선순위: ① staff_accounts.sms_sender_phone → ② SOLAPI_SENDER_PHONE(대표 발신번호)
 *
 * 발송 실패 시 대표번호로 재발송하는 3단계는 `lib/sendSms.ts`가 처리한다
 * (여기서는 "무엇으로 시도할지"만 정한다).
 *
 * ⚠️ 본문 안내번호로 쓸 때 담당자 번호가 없으면 **대표 발신번호가 아니라
 * 고객센터 대표번호를 안내한다** — 대표 발신번호는 발송 전용이라 고객이 걸어도
 * 받을 사람이 없을 수 있기 때문. `contactPhoneForBody`를 쓸 것.
 */
export async function resolveSmsSender(): Promise<ResolvedSender> {
  const fallbackPhone = toDigits(process.env.SOLAPI_SENDER_PHONE);
  const staff = await getCurrentStaff();
  const admin = getAdminClient();

  let staffPhone = "";
  if (staff && admin) {
    const { data } = await admin
      .from("staff_accounts")
      .select("sms_sender_phone")
      .eq("id", staff.id)
      .maybeSingle();
    staffPhone = toDigits((data as any)?.sms_sender_phone);
  }

  const usingStaff = staffPhone.length > 0;
  const phone = usingStaff ? staffPhone : fallbackPhone;
  return {
    phone,
    display: formatSenderPhone(phone),
    staffName: staff?.name || null,
    isStaffPhone: usingStaff,
    fallbackPhone,
  };
}

/**
 * 문자 본문에 적을 안내번호(하이픈 표기).
 * 담당자 번호가 등록돼 있으면 그 번호를, 없으면 고객센터 대표번호를 안내한다.
 */
export function contactPhoneForBody(sender: ResolvedSender): string {
  return sender.isStaffPhone ? sender.display : COMPANY_SUPPORT_PHONE;
}

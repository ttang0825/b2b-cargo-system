// 견적서 공유 링크 (2026-09-15 · 사용자 지시).
//
// 사용자 원문:
//   *"견적문자 발송에서 간단한 멘트와(견적서발송,위캐리운송포함) 견적서 url을 보낼수
//     있나? 가급적 (SMS) 문자이면 좋겠다."*
//
// 사용자 확정 3건:
//   ① 확인을 한 번 더 받는다 — **연락처 뒤 4자리**
//   ② **유효기간이 지나면 막는다**
//   ③ **기존 견적안내 문자를 대체한다**
//
// 🔴 **이 파일이 「누가 이 견적서를 볼 수 있는가」의 유일한 정의처다.**
//    토큰 생성 · 유효기간 판정 · 뒤 4자리 대조가 전부 여기 있다. 라우트나 화면에
//    같은 판단을 다시 적지 말 것 — 한쪽만 고치면 **막았다고 생각한 문이 열려 있다.**
//
// 🔴 **토큰이 곧 열쇠다.** 이 값을 아는 사람은 그 견적서(화주 상호·구간·금액)를 본다.
//    문자가 전달되면 그대로 열리므로 **뒤 4자리를 한 번 더 묻는 것이 그 대비**다.
//    ⚠️ 4자리는 10,000 가지뿐이라 **토큰을 이미 아는 사람에게는 벽이 아니다** —
//       32차 로그인 제한과 같은 성격의 **과속방지턱**이고, 그래서 시도 횟수도 센다.
//       진짜 방어선은 토큰의 추측 불가능성이다.

import { randomBytes } from "crypto";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * 🔴 **길이를 줄이지 말 것.** 22자 base62 는 약 131비트다 — 무작위로 맞히는 것이
 *    현실적으로 불가능해야 한다(맞히면 남의 견적서가 열린다).
 *    ⚠️ 마이그레이션의 `quotes_share_token_len_check` 가 16자 미만을 DB 에서도 막는다.
 * ⚠️ 문자 byte 예산은 이 길이까지 계산해 둔 것이다(아래 `quoteShareUrl` 주석).
 */
export const SHARE_TOKEN_LENGTH = 22;

/** 🔴 견적서가 스스로 인쇄하는 유효기간과 **같은 값**이다(발행일 + 7일). */
export const QUOTE_VALID_DAYS = 7;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 추측 불가능한 토큰을 만든다.
 *
 * 🔴 **`Math.random()` 을 쓰지 말 것** — 예측 가능한 난수라 토큰이 열쇠 구실을 못 한다.
 * ⚠️ 나머지 연산의 치우침을 피하려고 62의 배수 범위 밖 바이트는 버린다.
 */
export function generateShareToken(length = SHARE_TOKEN_LENGTH): string {
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length)) {
      if (b >= max) continue;
      out += ALPHABET[b % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/**
 * 문자에 실리는 주소.
 *
 * 🔴 **경로가 `/q/` 로 짧은 것은 의도다** — SMS 는 90byte 이고 그 안에 안내 문구까지
 *    들어가야 한다. 실측: `https://wecarrylogis.co.kr/q/` 29자 + 토큰 22자 = **51byte**.
 *    경로를 `/quote-share/` 처럼 늘리면 **문구를 줄여야 하거나 LMS 로 넘어간다.**
 * 🔴 주소는 `lib/siteUrl.ts` 한 곳에서만 온다.
 */
export function quoteShareUrl(token: string): string {
  return `${SITE_URL}/q/${token}`;
}

/**
 * 유효기간이 지났는가 — 🔴 **견적서가 인쇄하는 것과 같은 규칙**이다.
 *
 * 🔴 **`share_token_issued_at`(발급 시각)이 아니라 `created_at`(발행일) 기준이다.**
 *    발급 시각으로 재면 담당자가 언제 문자를 보냈느냐에 따라 링크가 살아 있는 기간이
 *    달라져서, **견적서에 인쇄된 「…까지 유효」와 실제로 막히는 날이 갈린다.**
 *    화주는 종이에 적힌 날짜를 믿는다.
 */
export function isQuoteShareExpired(
  createdAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!createdAt) return true;
  const validUntil = new Date(createdAt);
  if (Number.isNaN(validUntil.getTime())) return true;
  validUntil.setDate(validUntil.getDate() + QUOTE_VALID_DAYS);
  // 🔴 그 날 **끝까지** 유효하다 — 견적서가 날짜만 인쇄하므로(시각 없음) 시각으로
  //    자르면 「오늘까지 유효」라고 적힌 문서가 오전에 막힌다.
  validUntil.setHours(23, 59, 59, 999);
  return now.getTime() > validUntil.getTime();
}

/** 숫자만 남긴다 — 하이픈이 있든 없든 같게 본다(원칙 35번과 같은 결). */
function digitsOf(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

/**
 * 연락처 뒤 4자리 대조.
 *
 * 🔴 **대조 대상은 「문자를 받은 그 번호」여야 한다** — 화주 담당자 휴대폰
 *    (`companies.contact_mobile`)이거나 게스트 연락처(`guest_phone`)이고,
 *    그 우선순위는 견적 문자 API 가 수신번호를 정하는 것과 **같아야 한다.**
 *    다르면 문자를 받은 사람이 자기 번호로는 못 여는 일이 생긴다.
 * 🔴 **번호가 없으면 `false`** — 열어 주지 않는다. 확인할 방법이 없는데 통과시키면
 *    그 견적서는 토큰만으로 열리는 것이 되어 사용자 결정 ①이 무의미해진다.
 */
export function matchesPhoneLast4(
  phone: string | null | undefined,
  input: string | null | undefined
): boolean {
  const digits = digitsOf(phone);
  const typed = digitsOf(input);
  if (digits.length < 4 || typed.length !== 4) return false;
  return digits.slice(-4) === typed;
}

/** 화면·API 가 같은 말을 쓰도록 — 🔴 실패 사유를 구분해서 알려주지 않는다. */
export const SHARE_NOT_FOUND_MESSAGE =
  "견적서를 찾을 수 없습니다. 문자로 받으신 주소를 다시 확인해주세요.";
export const SHARE_EXPIRED_MESSAGE =
  "견적 유효기간이 지났습니다. 담당자에게 문의해주세요.";
/**
 * 🔴 **「토큰이 틀렸다」와 「뒤 4자리가 틀렸다」를 갈라 말하지 않는다** —
 *    가르면 남의 링크를 주운 사람에게 *"이 토큰은 맞다"*를 알려주는 셈이라,
 *    4자리만 두드리면 된다는 신호가 된다(32차 로그인 문구와 같은 판단).
 */
export const SHARE_FAILED_MESSAGE =
  "확인에 실패했습니다. 견적서를 받으신 연락처 뒤 4자리를 확인해주세요.";
export const SHARE_LOCKED_MESSAGE =
  "확인 시도가 너무 많았습니다. 5분 후에 다시 시도해주세요.";

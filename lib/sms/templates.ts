import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { ARRIVAL_FILLER_TIME } from "@/lib/arrivalType";
import { SMS_BYTE_LIMIT, byteLength } from "@/lib/sms/byteLength";

// SMS 문구 유일 정의처.
//
// ⚠️ **머리말은 2026-09-18 에 한글로 통일됐다**(사용자 확정: *「머리말은 [위캐리운송]으로
// 통일.」*). 그전에는 영문 표기였고, 발신번호가 개인 휴대폰이라 스팸으로 오인되지 않게
// 문두에 이름을 붙이는 것이 목적이었다 — **그 목적은 그대로이고 표기만 바뀌었다.**
// 🔴 정의처는 아래 `SMS_HEADER` 하나다. 화면·라우트에 문자열로 다시 적지 말 것.
//
// ⚠️ **안내번호는 이제 상수가 아니라 인자로 받는다(35차, 10차 지시서)** —
// 고객이 회신할 때 **보낸 담당자에게 직접 닿게** 하려고, 발신번호와 본문 안내번호를
// 둘 다 로그인한 담당자의 번호로 맞춘다. 담당자 번호가 등록돼 있지 않으면 호출부가
// 고객센터 대표번호를 넘긴다(`lib/smsSenderPhone.ts`의 contactPhoneForBody).
// **템플릿 안에서 COMPANY_SUPPORT_PHONE을 직접 쓰지 말 것** — 안내번호가 담당자
// 번호로 바뀌지 않고 대표번호로 고정돼버린다.
//
// ⚠️ **용어 기준(33차)**: 이 문구들은 고객·차주에게 그대로 발송되므로 고객 접점 용어를
// 쓴다 — "화주"가 아니라 **"고객"**, "화주포털"이 아니라 **"운송관리"**. 반면 코드
// 주석은 내부 문서라 정확성 우선으로 "화주" 표현을 그대로 둔다(혼동 방지).
// **"차주"는 고객 접점에서도 그대로 쓴다** — 바꾸지 말 것.
//
// ⚠️ **byte 관리** — 🔴 **「8종이 전부 LMS」는 낡았다.** 지금은 **7종이고 견적만 SMS**다.
// 견적안내가 2026-09-15 에 **견적서 링크 문자(87byte SMS)**로 대체됐고
// (`quoteShareLinkMessage`), 나머지 여섯은 설계상 LMS 다.
// 🔴 **견적 링크 문자는 여유가 3byte 다(87/90)** — 문구를 고치면 반드시 다시 재십시오.
//    넘으면 에러가 아니라 **요금과 제목만 조용히 달라진다.**
// ⚠️ 35차의 「90byte 압축을 되살리지 말 것」은 **`quoteSummaryMessage`(링크를 못 만든
//    견적의 폴백 LMS)에 대한 것**이라 링크 문자와 부딪히지 않는다.
// 나머지 여섯은 상한이 없지만 **스크롤 없이 한 화면에 들어오도록 400~500byte를 넘기지 말 것.**

/** 기본 인자 — 견적 링크 문자를 뺀 나머지가 안내번호(하이픈 표기)를 받는다 */
type WithContact = { contactPhone?: string | null };

/**
 * 문자 머리말 — 🔴 **정의처는 여기 하나다.** 화면·라우트에 문자열로 다시 적지 말 것.
 *
 * 사용자 확정(2026-09-17): *「머리말은 [위캐리운송]으로 통일.」*
 * 🟢 **문자 7종이 전부 이 상수를 쓴다**(2026-09-18 · 견적 LMS 제목 포함).
 * 🔴 **이메일 제목의 `[WeCarry]` 는 이 범위가 아니다**(Resend 미가동).
 */
export const SMS_HEADER = "[위캐리운송]";

/** 안내번호가 비어 있으면 대표번호로 되돌린다(호출부 실수 방어) */
function contact(p: string | null | undefined): string {
  return (p || "").trim() || COMPANY_SUPPORT_PHONE;
}

const WEEKDAY_KO: Record<string, string> = {
  Sun: "일", Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토",
};

/**
 * 🚨 **한국 시각으로 뽑는다 — `getHours()`·`getDate()` 를 쓰지 말 것.**
 *
 * 이 함수들은 **서버 라우트**에서 돌고 Vercel 함수의 시간대는 **UTC** 다.
 * 그래서 `d.getHours()` 는 KST 를 그대로 못 읽는다(실측 2026-09-18):
 *
 *     KST 2026-09-18 00:00  →  getHours() 15  (9시간 어긋남)
 *     KST 2026-09-18 09:00  →  getHours()  0  · **날짜까지 하루 앞으로 밀린다**
 *
 * 문자는 고객·차주가 **그 시각에 현장에 가는 값**이라 한 시간도 틀리면 안 된다.
 * 🔴 **`Intl` 에 `timeZone: "Asia/Seoul"` 을 주는 이 방식을 되돌리지 말 것.**
 * ⚠️ 이것은 배차확정 두 통을 만들면서 **같이 고친 기존 결함**이다 — 배차확정 문자
 *    발송 이력이 0건이라 실피해는 없었다(`_verify.sql` ㉚-c). `quoteSummaryMessage`
 *    (견적 링크를 못 만들었을 때의 폴백 LMS)도 이 함수를 써서 함께 맞아졌다.
 * ⚠️ `hourCycle: "h23"` 이 필요하다 — `hour12: false` 만 주면 자정이 `24` 로 나오는
 *    ICU 판본이 있다.
 */
function kstParts(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return {
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    weekday: WEEKDAY_KO[get("weekday")] ?? "",
  };
}

/** "8/21(목) 09:00" — 고객·차주가 일정을 확인해야 하는 문자에 씀 */
function dateTimeWithWeekday(value: string | null | undefined): string | null {
  const p = kstParts(value);
  if (!p) return null;
  return `${p.month}/${p.day}(${p.weekday}) ${p.hour}:${p.minute}`;
}

/** "8/21(목)" — 당착·내착이라 시각이 자리 채움일 때 */
function dateOnlyWithWeekday(value: string | null | undefined): string | null {
  const p = kstParts(value);
  if (!p) return null;
  return `${p.month}/${p.day}(${p.weekday})`;
}

/**
 * 🔴 **하차 일시의 `23:59` 는 시각이 아니라 자리 채움이다**(`lib/arrivalType.ts`) —
 *    화주가 「당착/내착」을 골라 시각을 지정하지 않은 건이고, 실제로 운영에 **3건**
 *    있다(`_verify.sql` ㉚-g). 문자에 「23:59」가 찍히면 차주와 고객이 **밤 12시 직전
 *    도착**으로 읽는다. 그래서 그런 건은 **날짜만** 찍는다.
 * 🔴 **그 시각을 여기 문자열로 다시 적지 말 것** — 정의처는 `ARRIVAL_FILLER_TIME` 하나다.
 * ⚠️ `orders` 에는 도착구분 컬럼이 **없다**(28차·PR #153 결정) — 그래서 값으로만 가른다.
 */
function isArrivalFillerTime(value: string | null | undefined): boolean {
  const p = kstParts(value);
  if (!p) return false;
  return `${p.hour}:${p.minute}` === ARRIVAL_FILLER_TIME;
}

/** 자리 채움이면 날짜만, 아니면 날짜+시각 */
function scheduleText(value: string | null | undefined): string | null {
  return isArrivalFillerTime(value) ? dateOnlyWithWeekday(value) : dateTimeWithWeekday(value);
}

/** 담당자 이름이 있으면 "(담당 홍길동)"을 붙인 안내번호 줄을 만든다 */
function contactLine(params: WithContact & { staffName?: string | null }): string {
  const who = params.staffName ? ` (담당 ${params.staffName})` : "";
  return `문의 ${contact(params.contactPhone)}${who}`;
}

/**
 * 상·하차 현장의 「담당 …」 한 줄. 🔴 **입력된 것만 적는다.**
 *
 * 사용자 원문(2026-09-17): *「기입되어 있는 선안에서 상하차지 담당자 이름과
 * 전화번호가 있어야 한다.」* 🔴 **빈 칸을 「미정」·「-」로 채우지 말 것** — 차주가
 * 그 글자를 보고 전화를 걸 수는 없고, 없는 정보를 있는 것처럼 적는 줄이 된다.
 * 둘 다 비면 **줄째 없앤다**(`null` 반환).
 */
function contactPersonLine(name: string | null | undefined, phone: string | null | undefined): string | null {
  const parts = [(name || "").trim(), (phone || "").trim()].filter(Boolean);
  return parts.length ? `담당 ${parts.join(" ")}` : null;
}

/**
 * 품목·특이사항은 자유 입력이라 길이가 들쭉날쭉하다. LMS 상한(2,000byte)에는 한참
 * 못 미치지만 **문자가 한 화면에 들어오는 것**이 목표라 넉넉한 상한을 둔다
 * (견적 문자의 `QUOTE_ITEM_MAX_CHARS` 와 같은 결이되, 쓰는 자리가 달라 따로 둔다).
 */
const DISPATCH_FREE_TEXT_MAX_CHARS = 100;

function clip(v: string | null | undefined): string | null {
  const t = (v || "").trim();
  if (!t) return null;
  return t.length > DISPATCH_FREE_TEXT_MAX_CHARS ? `${t.slice(0, DISPATCH_FREE_TEXT_MAX_CHARS)}…` : t;
}

/** 상·하차 한 구간(머리 줄 + 상호 + 주소 + 담당 + 조건) — 빈 줄은 전부 빠진다 */
function siteBlock(params: {
  label: "상차" | "하차";
  at: string | null;
  companyName: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  condition: string | null;
}): (string | null)[] {
  const when = scheduleText(params.at);
  return [
    when ? `■ ${params.label} ${when}` : `■ ${params.label}`,
    (params.companyName || "").trim() || null,
    (params.address || "").trim() || null,
    contactPersonLine(params.contactName, params.contactPhone),
    (params.condition || "").trim() ? `${params.label}조건 ${params.condition!.trim()}` : null,
  ];
}

/**
 * 차주용 **「화물정보 안내」**(키는 `dispatch_confirmed` 그대로).
 *
 * 사용자 확정(2026-09-17): *「배차확정안내(차주): "배차확정 안내"->"화물정보 안내" 로
 * 바꾸자. 상하차지 정보는 상세히 보내주자.」*
 *
 * 🔴 **키(`dispatch_confirmed`)를 바꾸지 말 것** — 바꾸면 옛 발송 이력과 끊긴다.
 *    바뀐 것은 **라벨과 본문**뿐이다(`lib/smsLogLabels.ts`).
 *
 * 🔴 **화주 대표 연락처를 넣지 말 것.** PR #73 이 뺀 이유는 *「오더 1건에 화주 연락처가
 *    하나뿐인데 실제로는 상차지·하차지 담당자가 서로 다르다」* 였고, 그 이유는 34차가
 *    **상·하차지 담당자 칸을 따로 만들면서 해소됐다.** 여기 들어가는 것은 **그 칸**이다.
 *
 * 🔴 **운임·수수료를 넣지 말 것** — 차주 운임은 정보망·통화로 합의한 값이고, 문자에
 *    남으면 분쟁 때 그 숫자가 기준이 된다.
 *
 * 🔴 **이모지를 쓰지 말 것** — 솔라피 단문·장문은 EUC-KR(KS X 1001) 범위다.
 *    구분 기호는 그 안에 있는 `■` 만 쓴다.
 *
 * 🟡 상·하차 조건과 품목은 **차를 대기 전에 알아야 하는 정보**라 넣었다. 리뷰에서 뺄 수
 *    있게 **줄 단위**로 만들어 뒀다(한 줄을 지우면 그 항목만 빠진다).
 */
export function dispatchConfirmedMessage(
  params: WithContact & {
    origin: string | null;
    destination: string | null;
    pickupAt: string | null;
    deliveryAt: string | null;
    originCompanyName: string | null;
    originContactName: string | null;
    originContactPhone: string | null;
    destinationCompanyName: string | null;
    destinationContactName: string | null;
    destinationContactPhone: string | null;
    loadCondition: string | null;
    unloadCondition: string | null;
    item: string | null;
    specialNotes: string | null;
    staffName?: string | null;
  }
): string {
  return [
    `${SMS_HEADER} 화물정보 안내`,
    ...siteBlock({
      label: "상차",
      at: params.pickupAt,
      companyName: params.originCompanyName,
      address: params.origin,
      contactName: params.originContactName,
      contactPhone: params.originContactPhone,
      condition: params.loadCondition,
    }),
    ...siteBlock({
      label: "하차",
      at: params.deliveryAt,
      companyName: params.destinationCompanyName,
      address: params.destination,
      contactName: params.destinationContactName,
      contactPhone: params.destinationContactPhone,
      condition: params.unloadCondition,
    }),
    clip(params.item) ? `■ 화물 ${clip(params.item)}` : null,
    clip(params.specialNotes) ? `요청사항: ${clip(params.specialNotes)}` : null,
    "건강 조심하시고 안전운전하세요.",
    contactLine(params),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 고객용 **「배차확정 안내」**(신설 · `dispatch_confirmed_customer`).
 *
 * 사용자 원문(2026-09-17): *「배차확정안내는 차주뿐만 아니라 고객에도 필요하다. …
 * 이는 고객에게 배차내용을 다시 확인할수 있고 잘못된 상하차지나 차량배차를 사전에
 * 발견할수 있으며 기사와 화주간 연락 착오를 줄일 수 있다.」*
 *
 * 🚨 **HANDOFF §5-4·§5-23 의 「차주 성명·연락처·차량번호는 화주에게 노출하지 않는다」는
 *    화면 기준이다** — 이 문자로는 **보낸다**(사용자 확정). 처리방침 제4조가 이미
 *    *「운송을 의뢰한 고객 — 배차 확정 정보 안내 — 차주 성명, 연락처, 차량번호, 차량
 *    종류」* 를 적고 있어서 **그 조가 이제 사실과 맞게 된다.**
 *    🔴 **「비노출이라고 적혀 있다」를 근거로 기사 정보를 빼지 말 것.**
 *    🔴 **반대로 화주포털 화면에 기사 정보를 띄우지도 말 것** — 그쪽은 그대로다.
 *
 * 🔴 **기사 정보가 비면 「미등록」으로 찍는다 — 차주용과 반대다.** 이 문자의 목적이
 *    **기사 정보 확인**이라, 줄째 빠지면 담당자가 빠진 줄 모르고 보낸다. 확인창에서
 *    「미등록」이 보여야 채우고 보낸다.
 *
 * 🔴 **운임·품목·특이사항을 넣지 말 것** — 확인용 정보만 둔다(특이사항에는 내부 메모가
 *    섞이고, 금액은 분쟁 때 기준이 된다).
 */
export function dispatchConfirmedCustomerMessage(
  params: WithContact & {
    origin: string | null;
    destination: string | null;
    pickupAt: string | null;
    deliveryAt: string | null;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    vehicleType: string | null;
    staffName?: string | null;
  }
): string {
  const NOT_SET = "미등록";
  const pickup = scheduleText(params.pickupAt);
  const delivery = scheduleText(params.deliveryAt);
  const vehicle = [(params.vehicleType || "").trim(), (params.vehicleNumber || "").trim()].filter(Boolean);
  const driver = [(params.driverName || "").trim(), (params.driverPhone || "").trim()].filter(Boolean);

  return [
    `${SMS_HEADER} 배차확정 안내`,
    "요청하신 운송 건의 배차가 확정되었습니다.",
    pickup ? `■ 상차 ${pickup}` : "■ 상차",
    (params.origin || "").trim() || null,
    delivery ? `■ 하차 ${delivery}` : "■ 하차",
    (params.destination || "").trim() || null,
    `■ 차량 ${vehicle.length ? vehicle.join(" ") : NOT_SET}`,
    `■ 기사 ${driver.length ? driver.join(" ") : NOT_SET}`,
    "내용이 요청과 다르면 바로 연락 주세요.",
    contactLine(params),
  ]
    .filter(Boolean)
    .join("\n");
}

// 🔴 **상차완료·하차완료 문자는 2026-09-18 에 폐지했다** — `pickupCompletedMessage`·
//    `deliveryCompletedMessage` 두 함수가 여기 있었다. 사용자 확정: *「상차완료안내(고객),
//    하차완료안내(고객)은 문자 발송이 필요없다. 알림으로만 충분하다. 삭제하자.」*
//    화주는 이제 운송관리 알림(화면 배너 + 웹 푸시)으로 받는다(HANDOFF §5-17).
//    🔴 **되살리지 말 것** — 되살리려면 「알림으로 충분하다」는 확정부터 뒤집어야 한다.
//    ⚠️ `pickup_completed`·`delivery_completed` **키는 살아 있다**(옛 이력 표시·재발송).
//       `lib/smsLogLabels.ts` · `lib/sendSms.ts` 의 주석을 볼 것.

// /apply 승인은 회사 등록+포털계정 발급이 같은 요청 안에서 동시에 일어나므로,
// "승인" 안내와 "계정발급" 안내를 따로 두 통 보내지 않고 하나로 합침
export function applicationApprovedWithAccountMessage(
  params: WithContact & {
    companyName: string | null;
    loginId: string;
    password: string;
    portalUrl: string;
    staffName?: string | null;
  }
): string {
  return [
    `${SMS_HEADER} 고객등록 승인 및 계정발급 안내`,
    `${params.companyName || "귀사"}의 고객등록 신청이 승인되었습니다.`,
    `아이디: ${params.loginId} / 임시비밀번호: ${params.password}`,
    `운송관리: ${params.portalUrl}`,
    "최초 로그인 시 비밀번호를 변경해주세요.",
    contactLine(params),
  ].join("\n");
}

export function applicationRejectedMessage(
  params: WithContact & { companyName: string | null; reason: string | null; staffName?: string | null }
): string {
  return [
    `${SMS_HEADER} 고객등록 신청 결과 안내`,
    `${params.companyName || "귀사"}의 고객등록 신청이 반려되었습니다.`,
    params.reason ? `사유: ${params.reason}` : null,
    contactLine(params),
  ]
    .filter(Boolean)
    .join("\n");
}

// 화주 상세화면에서 단독으로(신청서 승인과 무관하게) 포털 계정을 발급할 때.
// (함수·변수명의 portal, 주석의 "화주"는 내부 용어라 그대로 두고 발송 문구만 고객 접점 용어를 씀)
export function portalAccountIssuedMessage(
  params: WithContact & { loginId: string; password: string; portalUrl: string; staffName?: string | null }
): string {
  return [
    `${SMS_HEADER} 운송관리 계정발급 안내`,
    `아이디: ${params.loginId} / 임시비밀번호: ${params.password}`,
    `운송관리: ${params.portalUrl}`,
    "최초 로그인 시 비밀번호를 변경해주세요.",
    contactLine(params),
  ].join("\n");
}

/**
 * 적립 안내(2차, 2026-09-21) — 🔴 **적립이 확정되는 순간에만 나간다**(입금 확인).
 *
 * 🔴 **금액 둘만 적는다** — 이번에 적립된 금액과 누적 잔액. 어느 오더인지·어떤 운임의
 *    몇 %인지는 **포털 「적립금」 화면**이 말한다(이 문자는 「가서 보라」는 신호다).
 *    ⚠️ 한 번에 여러 건이 적립되는 경우가 있어서(월정산 묶음은 13건도 된다) 건별로
 *       적으면 문자가 한없이 길어지고, 무엇보다 **문자가 13통 나간다.**
 *       🔴 **건별로 쪼개지 말 것** — 한 번의 적립에 한 통이다.
 *
 * 🚨 **지급 방식을 적지 말 것**(「상품권으로 드립니다」류) — 세무·법무 검수 전이고,
 *    문자로 나간 말은 회수되지 않는다(HANDOFF §5-27).
 * 🚨 **사용 조건을 약속하지 말 것** — 최소 사용 금액·사용 기한은 캠페인 값이라 바뀔 수
 *    있고, 이미 나간 문자는 고쳐지지 않는다. 포털 화면이 **그때의 값**을 보여준다.
 *
 * ⚠️ **LMS 다**(151byte · 실측). 나머지 여섯 종과 같고, 90byte 안에 넣으려면 머리말이나
 *    문의 줄을 빼야 한다 — 둘 다 뺄 수 없다(머리말은 7종 공통, 문의는 회신 경로).
 */
export function rewardEarnedMessage(
  params: WithContact & {
    /** 이번에 적립된 금액(여러 건이면 합계) */
    amount: number;
    /** 적립 후 잔액 */
    balance: number;
    /**
     * 아직 입금이 확인되지 않은 건의 **예상 적립** — 3차(2026-09-21)에 추가.
     *
     * 🔴 **없거나 0이면 줄을 아예 안 쓴다** — 「예상 0원」은 「앞으로 쌓일 것이
     *    없다」로 읽힌다. 🔴 **잔액에 더하지 말 것**(입금이 확인돼야 적립된다).
     * 🔴 **「예정」을 빼지 말 것** — 빼면 약속으로 읽힌다(표시광고법 결).
     */
    pendingAmount?: number | null;
    pendingCount?: number | null;
    staffName?: string | null;
  }
): string {
  const pending =
    params.pendingAmount && params.pendingAmount > 0
      ? `정산 후 적립 예정 ${params.pendingAmount.toLocaleString("ko-KR")}원${
          params.pendingCount ? ` (운송 ${params.pendingCount}건)` : ""
        }`
      : null;
  return [
    `${SMS_HEADER} 적립 안내`,
    `운송 정산이 확인되어 ${params.amount.toLocaleString("ko-KR")}원이 적립되었습니다.`,
    `누적 적립금 ${params.balance.toLocaleString("ko-KR")}원`,
    ...(pending ? [pending] : []),
    "운송관리에서 적립 내역을 확인하실 수 있습니다.",
    contactLine(params),
  ].join("\n");
}

/**
 * 적립금 **차감** 안내 (리워드 3차, 2026-09-21 · 사용자 요청 *"얼마 차감됐고,
 * 어떻게 사용됐고 얼마 남았는지"*).
 *
 * 🚨 **「어떻게 사용됐는지」는 `reward_ledger.customer_note` 다.**
 *    🔴 **`description`(내부 사유)을 여기에 넣지 말 것** — 그 칸은 담당자의 내부
 *       메모이고 2차에 「화주에게 절대 주지 않는다」고 못박은 자리다.
 *    🔴 안내가 비어 있으면 **그 줄을 통째로 뺀다** — 「사용처: -」 는 아무 말도 아니다.
 *
 * 🔴 **지급 방식·사용 조건을 적지 말 것**(적립 안내와 같은 규칙) — 나간 문자는
 *    회수되지 않는다. 조건은 포털 화면이 **그때의 값**으로 말한다.
 */
export function rewardDeductedMessage(
  params: WithContact & {
    /** 차감된 금액 — 🔴 **양수로 받는다**(부호는 문구가 말한다) */
    amount: number;
    /** 차감 후 잔액 */
    balance: number;
    /** 🔴 화주에게 보이는 한 줄(`customer_note`) — 없으면 줄을 안 쓴다 */
    note?: string | null;
    staffName?: string | null;
  }
): string {
  const note = params.note && params.note.trim() ? params.note.trim() : null;
  return [
    `${SMS_HEADER} 적립금 사용 안내`,
    `적립금 ${Math.abs(params.amount).toLocaleString("ko-KR")}원이 차감되었습니다.`,
    ...(note ? [note] : []),
    `남은 적립금 ${params.balance.toLocaleString("ko-KR")}원`,
    "운송관리에서 적립 내역을 확인하실 수 있습니다.",
    contactLine(params),
  ].join("\n");
}

export function portalPasswordReissuedMessage(
  params: WithContact & { loginId: string; password: string; portalUrl: string; staffName?: string | null }
): string {
  return [
    `${SMS_HEADER} 운송관리 비밀번호 재발급 안내`,
    `아이디: ${params.loginId} / 새 임시비밀번호: ${params.password}`,
    `운송관리: ${params.portalUrl}`,
    "로그인 시 비밀번호를 다시 설정해주세요.",
    contactLine(params),
  ].join("\n");
}

// ⚠️ **이 함수는 더 이상 견적안내에서 쓰이지 않는다**(35차에 호출 제거).
// 다른 템플릿이 나중에 쓸 수 있어 **삭제하지 않고 남겨둠**(지시서 4-6).
export function truncateToBytes(text: string, maxBytes: number): string {
  let result = "";
  let bytes = 0;
  for (const ch of text) {
    const chBytes = ch.charCodeAt(0) > 0x7f ? 2 : 1;
    if (bytes + chBytes > maxBytes) break;
    result += ch;
    bytes += chBytes;
  }
  return result.trimEnd();
}

/**
 * LMS 제목 — 알림창에서 바로 구분되도록(지시서 4-4).
 *
 * ⚠️ **2026-09-15 부터 견적안내는 SMS 라 이 제목이 붙지 않는다**(`quoteShareLinkMessage`).
 *    ⚠️ **머리말이 2026-09-18 에 바뀌었다** — 그전에는 띄어쓰기가 있는 표기였다.
 *    이미 나간 LMS 의 제목은 그대로다(`sms_logs` 를 고치지 않는다).
 *    단문에는 제목이 없어서 주면 솔라피가 **LMS 로 올려버린다**(`lib/sms/solapiProvider.ts`).
 *    🔴 그래서 `app/api/admin/send-sms/route.ts` 가 **본문이 90byte 를 넘을 때만** 준다.
 *    상수 자체는 남겨 둔다 — 링크를 못 만든 견적은 옛 LMS 본문으로 나가고 그때 쓴다.
 */
export const QUOTE_SMS_SUBJECT = `${SMS_HEADER} 견적 안내`;

/**
 * 이 문자에 **LMS 제목을 붙일 것인가** — 🔴 **정의처는 여기 하나다.**
 *
 * 🚨 **두 곳에 따로 적은 것이 결함의 원인이었다.** `send-sms` 는 길이를 봤는데
 *    `sms-logs/resend` 는 `template_type` 만 보고 붙여서, **87byte 짜리 견적 링크
 *    문자를 재발송하면 제목이 붙어 LMS 로 나갔다**(솔라피는 제목이 있으면 단문을
 *    장문으로 올린다 — `lib/sms/solapiProvider.ts`). 에러가 아니라 **요금과 알림창
 *    표기만 달라져서** 눈치채기 어려운 자리다.
 *
 * 🔴 **`templateType` 만 보고 붙이던 쪽으로 되돌리지 말 것.**
 * ⚠️ 담당자가 확인창에서 본문을 길게 고치면 그때는 LMS 가 맞으므로 제목이 붙는다 —
 *    그래서 판정 기준이 **종류가 아니라 본문 길이**다.
 */
export function smsSubjectFor(templateType: string, message: string): string | null {
  if (templateType !== "quote_summary") return null;
  return byteLength(message) > SMS_BYTE_LIMIT ? QUOTE_SMS_SUBJECT : null;
}

// 시·도 축약. 견적안내의 "구간" 한 줄을 짧게 유지하기 위한 것으로,
// 목록 화면이 쓰는 `lib/shortAddress.ts`(도로명까지 남김)와는 목적이 달라 별도로 둔다.
// ⚠️ shortAddress를 이 용도로 고치지 말 것 — 운송오더·배차 목록의 구간 표시가 같이 바뀐다.
const SIDO_SHORT: [RegExp, string][] = [
  [/^서울(특별시)?/, "서울"], [/^부산(광역시)?/, "부산"], [/^대구(광역시)?/, "대구"],
  [/^인천(광역시)?/, "인천"], [/^광주(광역시)?/, "광주"], [/^대전(광역시)?/, "대전"],
  [/^울산(광역시)?/, "울산"], [/^세종(특별자치시)?/, "세종"], [/^경기(도)?/, "경기"],
  [/^강원(특별자치도|도)?/, "강원"], [/^충청북도|^충북/, "충북"], [/^충청남도|^충남/, "충남"],
  [/^전라북도|^전북(특별자치도)?/, "전북"], [/^전라남도|^전남/, "전남"],
  [/^경상북도|^경북/, "경북"], [/^경상남도|^경남/, "경남"],
  [/^제주(특별자치도)?/, "제주"],
];

/** "경기도 화성시 동탄순환대로 830" → "경기 화성" (시·구 단위면 충분, 지시서 4-3) */
function shortRegion(address: string | null | undefined): string | null {
  const raw = (address || "").trim();
  if (!raw) return null;
  const tokens = raw.split(/\s+/);
  const first = tokens[0] || "";
  const hit = SIDO_SHORT.find(([re]) => re.test(first));
  if (!hit) return tokens.slice(0, 2).join(" ") || raw;
  const sido = hit[1];
  // 세종처럼 시·군·구가 따로 없는 경우도 있으므로 없으면 시·도만 반환
  const second = (tokens[1] || "").replace(/(특별자치)?[시군구]$/, "");
  return second ? `${sido} ${second}` : sido;
}

// 품목명은 자유 입력이라 길이가 들쭉날쭉하다. 이제 자르지 않는 것이 원칙이지만,
// 극단적으로 긴 값이 들어와 문자가 스크롤 한참 내려가는 것은 막는다(지시서 4-6이
// 허용한 "넉넉한 상한"). 100자 = 200byte로, 400~500byte 목표 안에서 충분한 여유.
const QUOTE_ITEM_MAX_CHARS = 100;

/**
 * 견적안내 문자(35차 전면 개편, 10차 지시서 4장).
 *
 * 🔴 **90byte 압축을 되살리지 말 것.** 원래 143byte였던 문구를 SMS 단문 상한(90byte)에
 * 맞추느라 안내 문구를 빼고 품목명을 byte 단위로 잘라 붙이는 구조였고, 그 결과 고객이
 * **무슨 견적인지 알아보기 어려운** 문자가 나갔다. 건당 요금 차이는 약 20원 → 50원
 * (견적 100건 기준 월 3,000원)인데, 품목이 잘려 문의 전화가 한 번 더 오는 비용이 더
 * 크다고 판단해 LMS로 전환함. **다시 압축하자는 제안이 나오면 이 결정을 먼저 확인할 것.**
 *
 * 문구 설계 근거(임의로 바꾸지 말 것):
 *  - 금액을 별도 줄에 띄움 — 고객이 가장 먼저 찾는 정보라 목록에 섞이면 눈에 안 띈다
 *  - 구간은 한 줄로 압축 — 상·하차지를 두 줄로 쓰면 길어진다
 *  - 상·하차 조건 포함 — 조건 착오가 현장 분쟁의 주원인인데 압축 때 빠져 있었다
 *  - 추가비 안내 2줄 — 약관 제11조 2항("사유와 금액을 안내하고 협의한 후 청구")과 맞춤
 *  - 부가세 별도 명시 — 약관 제10조 2항이 공급가액 기준임을 규정
 *  - 담당자 이름 병기 — 회신 시 누구를 찾을지 명확해진다
 */
export function quoteSummaryMessage(
  params: WithContact & {
    item: string | null;
    vehicleType: string | null;
    finalAmount: number | null;
    pickupAt: string | null;
    origin?: string | null;
    destination?: string | null;
    loadCondition?: string | null;
    unloadCondition?: string | null;
    staffName?: string | null;
  }
): string {
  const route =
    params.origin || params.destination
      ? `${shortRegion(params.origin) || "상차지 미정"} → ${shortRegion(params.destination) || "하차지 미정"}`
      : null;

  const pickup = dateTimeWithWeekday(params.pickupAt);
  const item = params.item ? params.item.slice(0, QUOTE_ITEM_MAX_CHARS) : null;

  const condition = [
    params.loadCondition ? `${params.loadCondition} 상차` : null,
    params.unloadCondition ? `${params.unloadCondition} 하차` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const details = [
    route ? `· 구간   ${route}` : null,
    pickup ? `· 일시   ${pickup} 상차` : null,
    params.vehicleType ? `· 차량   ${params.vehicleType}` : null,
    item ? `· 품목   ${item}` : null,
    condition ? `· 조건   ${condition}` : null,
  ].filter(Boolean);

  // 최종 견적금액은 항상 공급가액(부가세 별도) 기준으로 저장됨(견적 상세 표시와 동일)
  const amount =
    params.finalAmount != null
      ? `견적 금액 ${Math.round(params.finalAmount).toLocaleString("ko-KR")}원 (부가세 별도)`
      : "견적 금액은 별도 안내드립니다.";

  return [
    "요청하신 운송 건의 견적을 안내드립니다.",
    "",
    ...details,
    "",
    amount,
    "",
    "현장 조건이 견적과 다를 경우 추가비가 발생할 수 있으며,",
    "사유와 금액을 안내드린 후 청구합니다.",
    "",
    contactLine(params),
  ].join("\n");
}

/**
 * 견적서 **링크** 문자 (2026-09-15 · 사용자 지시).
 *
 * 사용자 원문:
 *   *"견적문자 발송에서 간단한 멘트와(견적서발송,위캐리운송포함) 견적서 url을 보낼수
 *     있나? 가급적 (SMS) 문자이면 좋겠다."* → **기존 견적안내 문자를 대체**(확정 ③).
 *
 * 🔴 **35차의 「90byte 압축을 되살리지 말 것」을 뒤집는 것이 아니다 — 전제가 달라졌다.**
 *    그때 LMS 로 간 이유는 *"압축하면 품목이 잘려 무슨 견적인지 알아보기 어렵다"* 였다.
 *    지금은 **링크가 견적서 전체를 대신 보여준다** — 품목도 금액도 조건도 링크 안에
 *    온전히 있으므로, 본문에서 잘릴 정보 자체가 없다.
 *    🔴 **본문에 품목·금액을 다시 채워 넣지 말 것** — 그 순간 90byte 를 넘겨 LMS 가
 *       되고, 링크와 본문 둘 다 같은 말을 하는 문자가 된다.
 *
 * 🔴 **byte 예산이 빡빡하다 — 여유가 3byte 다.** 실측(`lib/sms/byteLength.ts`):
 *
 *      "[위캐리운송] 견적서를 보내드립니다."            35byte
 *      줄바꿈                                            1byte
 *      "https://wecarrylogis.co.kr/q/" + 토큰 22자      51byte
 *      ─────────────────────────────────────────────────────
 *                                                       87byte   (상한 90)
 *
 *    🔴 **문구를 바꾸면 반드시 byte 를 다시 잴 것** — 넘는 순간 조용히 LMS 가 된다
 *       (에러가 아니라 요금과 제목이 달라질 뿐이라 눈치채기 어렵다).
 *
 * ⚠️ **「문의 1661-2403」 한 줄을 넣지 않았다** — 넣으면 **102byte 로 LMS** 가 된다.
 *    🔴 넣지 말 것. 대신 ① 이 문자의 **발신번호가 담당자 본인 번호**라(35차) 받는
 *    사람이 그대로 회신·통화할 수 있고 ② 대표번호는 **견적서 화면 안에** 있다.
 *
 * 🔴 **URL 을 줄임주소로 감싸지 말 것** — 외부 서비스를 하나 더 믿어야 하고,
 *    그 서비스가 죽으면 이미 보낸 문자가 통째로 죽는다. `/q/` 가 짧은 이유가 이것이다.
 */
export function quoteShareLinkMessage(params: { shareUrl: string }): string {
  return [`${SMS_HEADER} 견적서를 보내드립니다.`, params.shareUrl].join("\n");
}

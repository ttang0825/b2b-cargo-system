import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { SITE_URL } from "@/lib/siteUrl";
import { ARRIVAL_FILLER_TIME } from "@/lib/arrivalType";

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
// 🔴 **예외는 없다 — 열세 판본이 전부 담당자 번호·이름을 적는다**(사용자 확정 2026-09-23:
// *「모든 문자메세지의 마지막에 문의 부분에 담당자의 연락처를 남기자.」*).
// ⚠️ **같은 날 한 번 갈렸다가 되돌아왔다** — 그 앞 지시(*「문의 전화번호랑 담당자 이름은
// 빼자. 대신 대표번호를」*)로 「정보 회신 요청」·「리워드 이용 안내」 둘만 대표번호로
// 고정하는 전용 함수를 뒀는데, 뒤 지시가 그것을 뒤집었다.
// 🔴 **그 전용 함수를 다시 만들지 말 것** — 두 문자만 다르게 두려는 판단은 한 번 접혔다.
// 🔴 **번호·이름을 코드에 적지 말 것** — 이 저장소는 public 이다. 값은 로그인한 담당자의
// `staff_accounts.sms_sender_phone` 과 이름에서 온다(`lib/smsSenderPhone.ts`).
// 등록된 번호가 없을 때만 대표번호로 떨어지는 것은 그대로 둔다(솔라피 미등록 번호를
// 안내하면 고객이 걸어도 받을 사람이 없다).
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
/**
 * 🚨 **「운송관리에서 적립 내역을 확인하실 수 있습니다」는 켜진 화주에게만 적는다**
 *    (2026-09-21 · 사용자 *"기본적으로 화주포털에는 리워드 상황을 노출안하는 경우가
 *    많을 것 같다"*).
 *
 * 🔴 `reward_memberships.portal_visible` 이 꺼져 있으면 화주 포털에 **적립금 메뉴가
 *    아예 없다.** 그 화주에게 이 줄을 보내면 **없는 화면을 찾아가라고 하는 것**이고,
 *    문자를 받은 사람이 로그인해서 메뉴를 뒤지다 담당자에게 전화하게 된다.
 * 🔴 **기본값은 「안 붙인다」다** — 인자를 안 넘긴 호출부가 생겼을 때 거짓말을
 *    하는 쪽이 아니라 **말을 아끼는 쪽**으로 떨어져야 한다.
 */
function portalLine(portalVisible?: boolean | null): string[] {
  return portalVisible === true ? ["운송관리에서 적립 내역을 확인하실 수 있습니다."] : [];
}

/**
 * 적립 **현황** 안내 (리워드 3차 후속, 2026-09-21).
 *
 * 🚨 **`rewardEarnedMessage` 와 다른 종류다 — 합치지 말 것.**
 *    앞엣것은 **입금이 확인되어 실제로 쌓인 순간**이고, 이것은 **아직 안 쌓인
 *    예상**을 알린다. 월정산 화주는 한 달치를 한 번에 입금하므로 그 전까지
 *    「얼마가 쌓이고 있는지」를 알 길이 이 문자뿐이다(사용자 2026-09-21).
 *
 * 🔴 **「예정」·「예상」을 빼지 말 것** — 빼면 약속으로 읽힌다(표시광고법 결).
 * 🔴 **지급 방식·사용 조건을 적지 말 것**(다른 리워드 문자와 같은 규칙) —
 *    나간 문자는 회수되지 않고 세무·법무 검수가 아직이다.
 */
export function rewardStatusMessage(
  params: WithContact & {
    /** 이번 운송 한 건의 예상 적립 — 🔴 운송완료 안내일 때만. 없으면 줄을 안 쓴다 */
    thisAmount?: number | null;
    /** 아직 입금 전인 건 전부의 예상 적립 합계 */
    pendingAmount?: number | null;
    pendingCount?: number | null;
    /** 이미 쌓인 적립금(원장 합계) */
    balance: number;
    portalVisible?: boolean | null;
    staffName?: string | null;
  }
): string {
  const won = (n: number) => n.toLocaleString("ko-KR");
  const lines: string[] = [`${SMS_HEADER} 적립 현황 안내`];
  if (params.thisAmount && params.thisAmount > 0) {
    lines.push(`운송 건이 완료되어 ${won(params.thisAmount)}원이 적립될 예정입니다.`);
  }
  if (params.pendingAmount && params.pendingAmount > 0) {
    lines.push(
      `정산 후 적립 예정 ${won(params.pendingAmount)}원${
        params.pendingCount ? ` (운송 ${params.pendingCount}건)` : ""
      }`
    );
  }
  // 🔴 **현재 적립금은 0원이어도 적는다** — 이 문자의 목적이 「얼마가 쌓이고
  //    있는지」라, 확정분이 0이라는 것 자체가 알려야 하는 사실이다
  //    (위 두 줄과 달리 「없으면 생략」이 아니다).
  lines.push(`현재 적립금 ${won(params.balance)}원`);
  lines.push(...portalLine(params.portalVisible));
  lines.push(contactLine(params));
  return lines.join("\n");
}

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
    /** 🚨 포털 노출 여부 — `portalLine()` 머리말 참고. 기본은 **안 붙인다** */
    portalVisible?: boolean | null;
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
    ...portalLine(params.portalVisible),
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
    /** 🚨 포털 노출 여부 — `portalLine()` 머리말 참고. 기본은 **안 붙인다** */
    portalVisible?: boolean | null;
    staffName?: string | null;
  }
): string {
  const note = params.note && params.note.trim() ? params.note.trim() : null;
  return [
    `${SMS_HEADER} 적립금 사용 안내`,
    `적립금 ${Math.abs(params.amount).toLocaleString("ko-KR")}원이 차감되었습니다.`,
    ...(note ? [note] : []),
    `남은 적립금 ${params.balance.toLocaleString("ko-KR")}원`,
    ...portalLine(params.portalVisible),
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
 * 이 문자에 **LMS 제목을 붙일 것인가** — 🔴 **정의처는 여기 하나다.**
 *
 * 🚨 **2026-09-23 부터 어떤 문자에도 제목을 붙이지 않는다**(사용자 확정 · PR #184 리뷰):
 *    *「문자내용에 [web발신] 상단에 볼드체 제목글처럼 들어간 건 없는게 낫지 않나?
 *      아래 내용과 중복된다.」*
 *    LMS 제목은 휴대폰에서 `[web발신]` 위에 **굵은 한 줄**로 그려지는데, 이 저장소의
 *    문자는 본문 첫 줄이 이미 `[위캐리운송] … 안내` 라서 **같은 말이 두 번** 나온다.
 *
 * 🟢 **없애도 문자 종류는 안 바뀐다** — 솔라피는 `type` 을 주지 않으면 **본문 길이로**
 *    SMS/LMS 를 가른다(`lib/sms/solapiProvider.ts`). 90byte 를 넘는 본문은 제목이
 *    없어도 그대로 LMS 다. 실제로 **13개 판본 중 12개가 이미 제목 없이** 나가고 있었고
 *    (실측 2026-09-23) 바뀐 것은 견적안내 폴백 LMS 하나뿐이다.
 * 🔴 **그 하나 때문에 `quoteSummaryMessage` 본문 첫 줄에 머리말을 넣었다** — 그 문자는
 *    본문에 `[위캐리운송]` 이 **없어서 제목이 유일한 브랜드 표시**였다. 제목만 떼면
 *    고객이 **누가 보낸 문자인지 알 수 없다.** 🔴 **둘을 따로 되돌리지 말 것.**
 *
 * 🚨 **제목을 두 곳에 따로 적은 것이 과거 결함의 원인이었다.** `send-sms` 는 길이를 봤는데
 *    `sms-logs/resend` 는 `template_type` 만 보고 붙여서, **87byte 짜리 견적 링크 문자를
 *    재발송하면 제목이 붙어 LMS 로 나갔다**(솔라피는 제목이 있으면 단문을 장문으로
 *    올린다). 에러가 아니라 **요금과 알림창 표기만 달라져서** 눈치채기 어려운 자리였다.
 *    ⚠️ **실은 세 곳이었다** — `send-quote-sms` 도 자기만의 판정을 갖고 있었다(실측
 *    2026-09-23). 셋 다 이 함수로 모았다.
 *
 * 🔴 **이 함수를 「항상 null 이니 지우자」로 지우지 말 것.** 판정이 한 곳에 있다는 것이
 *    위 결함을 막는 구조다 — 지우면 라우트마다 제목이 다시 생긴다.
 * 🔴 **제목을 되살리려면 본문 첫 줄의 머리말을 함께 빼야 한다**(그러지 않으면 사용자가
 *    지적한 중복이 그대로 돌아온다). `sendSmsWithLog` 의 `subject` 배관은 남겨 두었다.
 * ⚠️ **이미 나간 문자의 제목은 그대로다** — `sms_logs` 를 고치지 않는다.
 */
export function smsSubjectFor(_templateType: string, _message: string): string | null {
  return null;
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
    // 🔴 **머리말을 빼지 말 것**(2026-09-23 신설) — 이 문자는 2026-09-23 까지 본문에
    //    `[위캐리운송]` 이 **없었고** LMS 제목이 유일한 브랜드 표시였다. 제목을
    //    폐지하면서(`smsSubjectFor`) 여기로 옮긴 것이다. 🔴 **제목을 되살리는 것으로
    //    갈음하지 말 것** — 그러면 사용자가 지적한 「같은 말이 두 번」이 돌아온다.
    // ⚠️ 이 문자는 견적서 링크를 못 만들었을 때만 나가는 폴백이다(336byte LMS).
    `${SMS_HEADER} 요청하신 운송 건의 견적을 안내드립니다.`,
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

/**
 * 「정보 회신 요청」 문자 (2026-09-22 · 사용자 요청).
 *
 * 사용자 원문: *"견적문자 보내면서 추가로 문자를 하나더 보내면 좋겠다. 상,하차지
 *   상세주소와 상,하차지 담당자 연락처를 문자로 회신해 달라는 문자메세지. 이 메세지는
 *   화주통화 내용에 따라 보낼수도 있고 보내지 않을수도 있다."*
 *
 * 🔴 **견적 문자의 큐가 아니라 별도 버튼이다.** *"보낼수도 있고 보내지 않을수도 있다"*
 *    가 이 문자의 성격이고, 견적 문자 뒤에 자동으로 창을 띄우면 **안 보낼 때마다
 *    담당자가 창을 닫아야 한다.** 반대로 별도 버튼이면 **견적 문자를 이미 보낸 뒤**
 *    (또는 아예 보내지 않고) 이것만 따로 보내는 경우도 그대로 된다 — 실제로 주소가
 *    비는 것은 통화가 끝난 뒤에 드러난다.
 *    🔴 배차확정(2026-09-18)처럼 두 통을 잇는 구조로 바꾸지 말 것.
 *
 * 🚨 **제3자 개인정보를 청하는 문자다.** 상·하차지 현장 담당자는 화주 본인이 아니다 —
 *    47차(20차 3-4)가 화주포털 발주요청에서 같은 자리를 만났을 때 **동의 체크박스 +
 *    `consents` 저장 + 서버 게이트**로 풀었다. 문자에는 체크박스를 둘 수 없으므로
 *    **본인이 사전 동의를 받아 알려 달라는 한 줄**이 그 자리를 대신한다.
 *    🔴 **그 줄을 빼지 말 것** — 빼면 우리가 동의 없이 제3자 연락처를 모으는 모양이
 *    되고, 그 한 줄이 이 문자에서 유일한 고지다.
 *
 * 🔴 **구간은 `shortRegion` 으로 짧게만 적는다**(견적 문자와 같은 식) — 받는 사람이
 *    「어느 건인지」만 알면 되고, 전체 주소를 그대로 실으면 두 줄이 화면을 덮는다.
 *    ⚠️ 우리가 아는 주소를 길게 적으면 *「이미 아시는데 왜 묻나」* 로 읽히기도 한다.
 *
 * 🔴 **상세주소 칸은 `quotes` 에 따로 없다**(도로명 + 상세를 한 문자열로 합쳐 저장하는
 *    이 저장소의 관례 · 원칙 37번). 그래서 이 문자는 **회신을 청할 뿐** 어떤 칸이
 *    비었는지 짚지 않는다 — 짚으려면 없는 칸을 새로 만들어야 한다.
 */
export function quoteInfoRequestMessage(
  params: WithContact & {
    origin?: string | null;
    destination?: string | null;
    /** 담당자 이름 — 「문의 … (담당 …)」 한 줄에 쓴다(사용자 확정 2026-09-23) */
    staffName?: string | null;
  }
): string {
  const route =
    params.origin || params.destination
      ? `${shortRegion(params.origin) || "상차지 미정"} → ${shortRegion(params.destination) || "하차지 미정"}`
      : null;

  return [
    `${SMS_HEADER} 배차 준비를 위해 아래 정보를 회신 부탁드립니다.`,
    "",
    ...(route ? [`· 운송 구간   ${route}`, ""] : []),
    "[상차지]",
    "· 상세주소 (동·호수·출입구 등)",
    "· 현장 담당자 연락처",
    "",
    "[하차지]",
    "· 상세주소 (동·호수·출입구 등)",
    "· 현장 담당자 연락처",
    "",
    "이 문자에 그대로 회신해 주시면 됩니다.",
    // 🔴 **들여쓰기 공백을 넣지 말 것** — 문자에는 그 공백이 그대로 찍힌다(렌더링해서
    //    발견했다). 이 저장소의 다른 여섯 문자도 이어지는 줄을 들여쓰지 않는다.
    "※ 알려주신 현장 담당자 연락처는 해당 운송 건의 배차·연락 목적으로만 쓰이며,",
    "담당자분께 미리 알려주신 뒤 전달 부탁드립니다.",
    "",
    contactLine(params),
  ].join("\n");
}

/**
 * 「리워드 이용 안내」 문자 (2026-09-22 · 사용자 요청).
 *
 * 사용자 원문: *"포인트 지급 안내 메세지를 보내고 싶다. 고객 첫거래후 전화로 계정등록을
 *   유도할 생각이다. 계정등록후 계정정보 안내 문자를 보낸후 이벤트 포인트 사용안내
 *   문자도 보내고 싶다. 위치는 화주 상세 기업고객 리워드에 문자보내기 기능이 있으면
 *   되고 간단한 내용으로 전달하면 될것 같다."*
 *
 * 🔴 **리워드 문자가 넷이 됐다 — 합치지 말 것.** 넷이 서로 다른 시점을 가리킨다:
 *      reward_intro    이런 제도가 있습니다      ← 이 문자 (시작할 때 한 번)
 *      reward_status   이만큼 쌓일 예정입니다
 *      reward_earned   이만큼 쌓였습니다
 *      reward_deducted 이만큼 썼습니다
 *
 * 🚨 **지급 방식을 적지 말 것.** `reward_method`(상품권/운임 할인)는 2차가 화주에게
 *    **주지 않기로 못박은 값**이다 — 「상품권으로 드립니다」가 문자에 적히면 그것은
 *    **약속**이 되고, 세무·법무 검수(HANDOFF §7 · 열하나)가 끝나기 전이다.
 *    🔴 **나간 문자는 회수되지 않는다.**
 *    🟢 대신 **운임 할인**만 적는다 — 2026-09-22(`9307790`)에 실제로 도는 경로이고
 *       화주가 청구서에서 확인할 수 있는 사실이다.
 *
 * 🚨 **「자동 적립」·「모든 고객」이라고 적지 말 것.** 리워드는 **선택된 기업만** 참여하는
 *    프로모션이다(표시광고법 제3조 · HANDOFF §5-3). 외부 이벤트 안내 페이지가 지금
 *    *「별도 신청 절차 없이 이용 시 자동 적립됩니다」*라고 적고 있어 **그 페이지 링크도
 *    붙이지 않는다** — 고치기 전에는 이 문자에 URL 을 넣지 말 것.
 *
 * 🔴 **조건은 캠페인에서 읽는다 — 리터럴로 적지 말 것**(원칙 40번과 같은 결).
 *    요율·최소 사용액·사용 종료일은 담당자가 바꿀 수 있고, 문자에 박아 두면 바꾼 날부터
 *    거짓이 된다.
 * 🔴 **금액(잔액·예상)을 적지 않는다** — 그것은 `reward_status` 의 일이다. 이 문자는
 *    계정 발급 직후에 나가서 아직 쌓인 것이 없는 것이 보통이고, 「0원」을 적으면
 *    제도를 소개하는 자리에서 **혜택이 없다는 인상**만 남는다.
 */
export function rewardIntroMessage(
  params: WithContact & {
    companyName?: string | null;
    /**
     * 적립률 **퍼센트 값**(5 = 5%). 🔴 리터럴 5 를 적지 말 것 — 캠페인에서 읽는다.
     * 🚨 **`campaign.earn_rate` 를 그대로 넘기지 말 것** — 그 칸은 분수(`0.0500`)라
     *    그대로 오면 문자에 **「0.05%」**가 찍힌다. 호출부가 `* 100` 을 한다.
     */
    earnRatePercent: number;
    /** 최소 사용액(원) — 캠페인 `minimum_use_amount`. 0 이면 줄을 안 그린다 */
    minimumUseAmount?: number | null;
    /** 사용 종료일 `YYYY-MM-DD` — 없으면 줄을 안 그린다 */
    useEndDate?: string | null;
    /** 담당자 이름 — 「문의 … (담당 …)」 한 줄에 쓴다(사용자 확정 2026-09-23) */
    staffName?: string | null;
    /** 화주포털 적립금 화면이 켜져 있는가(`portal_visible`) */
    portalVisible?: boolean | null;
  }
): string {
  const rate = Number(params.earnRatePercent);
  const rateText = Number.isFinite(rate)
    ? `${Number.isInteger(rate) ? rate : Number(rate.toFixed(2))}%`
    : null;

  const min = Math.max(0, Math.round(Number(params.minimumUseAmount) || 0));
  const end = (params.useEndDate || "").slice(0, 10);
  const endText = /^\d{4}-\d{2}-\d{2}$/.test(end)
    ? `${end.slice(0, 4)}년 ${Number(end.slice(5, 7))}월 ${Number(end.slice(8, 10))}일`
    : null;

  const who = (params.companyName || "").trim();

  return [
    `${SMS_HEADER} ${who ? `${who} ` : ""}적립 혜택을 안내드립니다.`,
    "",
    // 🔴 **「선정된 고객사」를 빼지 말 것** — 이 한 줄이 「누구나 자동 적립」으로 읽히는
    //    것을 막는다(표시광고법 제3조 · 위 주석).
    "직접 거래해 주시는 고객사에 한해 적용되는 혜택입니다.",
    "",
    ...(rateText ? [`· 적립   운임 공급가액의 ${rateText}`] : []),
    "· 사용   쌓인 적립금만큼 운임에서 할인",
    ...(min > 0 ? [`· 조건   ${min.toLocaleString("ko-KR")}원부터 사용 가능`] : []),
    ...(endText ? [`· 기간   ${endText}까지 사용`] : []),
    "",
    // 🔴 **포털 줄은 켜진 화주에게만**(3차가 고친 결함과 같은 자리) — 꺼져 있으면
    //    그 메뉴가 아예 없어서 없는 화면을 찾아가라는 말이 된다.
    ...(params.portalVisible
      ? ["운송관리에서 적립 내역을 확인하실 수 있습니다.", ""]
      : ["적립 현황은 담당자가 문자로 안내드립니다.", ""]),
    // 🚨 **이 링크는 2026-09-22 에야 붙일 수 있게 됐다.** 그전에는 외부 이벤트 안내
    //    페이지가 *「별도 신청 절차 없이 이용 시 자동 적립됩니다」* 라고 적고 있어서
    //    **선택된 기업만 참여하는 실제 정책과 달랐고**(표시광고법 제3조 · HANDOFF §5-3)
    //    그래서 문자에서 링크를 일부러 뺐다. 지금 가리키는 곳은 **저장소 안에 새로 만든
    //    `/reward-event`** 이고, 그 페이지는 조건·기간을 **캠페인 값으로** 적고 맨 위에
    //    「선정된 고객사 한정」을 적는다.
    // 🔴 **외부 페이지 주소로 바꾸지 말 것** — 그 문구가 고쳐졌는지 우리가 알 수 없다.
    // 🔴 **주소를 여기 문자열로 적지 말 것** — 정의처는 `lib/siteUrl.ts` 하나다.
    `자세한 안내 ${SITE_URL}/reward-event`,
    "",
    contactLine(params),
  ].join("\n");
}

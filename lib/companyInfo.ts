// 회사 기본 정보 유일 정의처.
// 견적서 등 공식 문서(`COMPANY_INFO`)와 회사소개 페이지(`/about`), 이후 푸터(5차)가
// 모두 이 파일을 참조한다. **같은 값을 두 군데 적지 말 것** — 아래 /about용 상수도
// 겹치는 항목은 COMPANY_INFO에서 파생시켜 두었다.
//
// 대표 연락처는 `lib/contactInfo.ts`(COMPANY_SUPPORT_PHONE)가 유일 정의처이므로
// 화면에 노출할 전화번호는 그쪽을 쓸 것.

export const COMPANY_INFO = {
  name: "(주)디자인에그 — 위캐리 운송",
  ceo: "정제원",
  // 실제 사업자등록번호. 28차에서 자리표시자("000-00-00000")를 실제 값으로 교체함
  // — 회사소개(/about)에 표기하면서 같은 파일에 서로 다른 번호가 남는 것을 막기 위함
  bizRegNo: "105-87-66929",
  address: "서울특별시 금천구 가산디지털1로 100, 1110호 (가산 에이스골드타워)",
  // ⚠️ 아직 자리표시자. 아래 COMPANY_INFO_PHONE_IS_PLACEHOLDER와 **같이** 바꿀 것
  phone: "02-0000-0000",
  email: "", // 선택 입력
  bankAccount: "", // 선택: 입금계좌 안내가 필요하면 입력 (예: "국민은행 123-456-789012 (주)WeCarry운송")
};

// 위 COMPANY_INFO.phone이 아직 발급 전 자리표시자임을 나타내는 플래그.
// next.config.mjs가 빌드·서버 기동 시 이 파일을 읽어 값이 true이면 콘솔에 경고를
// 출력함(빌드를 실패시키지는 않음). **실제 번호로 교체할 때 phone과 이 플래그를 같이 바꿀 것.**
//
// ⚠️ 전화번호 자리표시자가 두 개라는 점에 주의:
//   - `lib/contactInfo.ts`의 COMPANY_SUPPORT_PHONE — 고객센터 번호(랜딩·운송관리·SMS)
//   - 이 파일의 COMPANY_INFO.phone — 견적서 PDF의 사업자 전화번호
// 전자상거래법 표시사항의 사업자 전화번호와 고객센터 번호는 실제로 다른 번호를 쓰는
// 경우가 많아 **두 상수를 하나로 합치지 않기로 함**(합치면 나중에 분리할 때 견적서까지
// 건드려야 함). 대신 둘 중 하나만 교체하고 나머지를 잊는 사고를 막으려고 양쪽 모두
// 빌드 경고 대상으로 등록해둠 — 한쪽을 바꿨는데 경고가 계속 뜬다면 나머지 하나가 남은 것.
export const COMPANY_INFO_PHONE_IS_PLACEHOLDER = true;

// ── 회사소개(/about)·푸터(5차) 표시용 ────────────────────────────────────────

export const COMPANY_LEGAL_NAME = "주식회사 디자인에그";
export const COMPANY_SERVICE_NAME = "위캐리 운송";
export const COMPANY_CEO = COMPANY_INFO.ceo;

// ⚠️ "에이스골드타워"가 맞음("골트타워" 아님)
export const COMPANY_ADDRESS = COMPANY_INFO.address;

// 대표 이메일. 개인정보 보호책임자·열람청구 접수처이자 푸터 표시사항.
//
// ⚠️ 위 `COMPANY_INFO.email`(견적서 PDF용, 현재 빈 값)과는 별개다 — 견적서에 이메일을
// 넣을지는 아직 정해지지 않았고, 그쪽을 채우면 발행되는 견적서 모양이 바뀌므로 건드리지 않음.
//
// **푸터에서는 반드시 `components/ObfuscatedEmail.tsx`로 감싸서 표시할 것**(스크래핑 방지).
// 반대로 **약관·개인정보처리방침 본문 안에서는 평문 그대로** 써야 한다 — 법정 고지사항이라
// 난독화하면 고지 효력에 문제가 생길 수 있음.
export const COMPANY_CONTACT_EMAIL = "director@designegg.tv";

// 보유 자격
export const COMPANY_FREIGHT_BROKER_LICENSE = "제180254호"; // 화물자동차 운송주선사업 허가
export const COMPANY_ECOMMERCE_LICENSE = "제2021-서울금천-2681호"; // 통신판매업 신고
export const COMPANY_BIZ_REG_NO = COMPANY_INFO.bizRegNo;

// 인사말(대표 인사) 본문.
// ⚠️ **이 문구는 확정본이 아니라 자리를 잡기 위한 임시안이다.** 이후 다듬어 교체할 예정이며,
// 교체할 때는 이 상수들만 고치면 /about 화면에 그대로 반영됨(문단 단위로 렌더링).
// 임의로 줄이거나 다듬지 말 것 — 수정이 필요하면 먼저 확인받을 것.
export const COMPANY_GREETING_PARAGRAPHS: string[] = [
  "안녕하세요. 위캐리 운송을 찾아주셔서 감사합니다.",
  "위캐리 운송은 화물 운송이 필요한 곳과 차량을 연결하는 화물운송 주선 서비스입니다. 주식회사 디자인에그가 화물자동차 운송주선사업 허가(제180254호)를 받아 운영하고 있습니다.",
  "운송이 필요한 순간은 대체로 갑작스럽습니다. 납품 일정이 앞당겨지거나, 늘 쓰던 차량이 잡히지 않거나, 평소보다 물량이 많아지는 날이 있습니다. 저희는 그럴 때 연락하실 수 있는 곳이 되고자 합니다.",
  "그래서 두 가지를 원칙으로 삼았습니다.",
];

// 위 본문 중 "첫째/둘째" 두 원칙은 소제목처럼 강조해서 보여줌(지시서 3-3 허용 사항)
export const COMPANY_GREETING_PRINCIPLES: { title: string; body: string }[] = [
  {
    // 원래 "계약으로 묶지 않습니다"였으나, 실제로는 계약 거래를 선호하기로 방침이 바뀌어
    // 교체함(32차) — 랜딩에서 "계약 없이"를 뺐는데 여기만 남으면 앞뒤가 맞지 않음.
    // ⚠️ 차량 범위는 "다마스부터 5톤 이상까지"로 적는다. "25톤"·"전 차종"은 쓰지 말 것.
    title: "첫째, 필요한 차량을 찾습니다.",
    body: "다마스부터 5톤 이상까지, 배차망을 통해 조건에 맞는 차량을 확보합니다.",
  },
  {
    title: "둘째, 기록을 남깁니다.",
    body:
      "견적서, 배차 내역, 인수증, 정산 내역을 운송관리 화면에서 언제든 확인하실 수 있습니다. " +
      "전화와 문자로만 오가다 나중에 확인할 방법이 없는 일을 만들지 않겠습니다.",
  },
];

export const COMPANY_GREETING_CLOSING_PARAGRAPHS: string[] = [
  "정식 허가와 적재물배상책임보험을 갖추고, 한 건 한 건 확인 가능한 기록으로 남기며 신뢰를 쌓아가겠습니다.",
  "문의 주시면 성실히 답변드리겠습니다. 감사합니다.",
];

export const COMPANY_GREETING_SIGNATURE = "주식회사 디자인에그 대표 정제원";

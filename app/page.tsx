import Link from "next/link";
import LandingHeader from "@/components/LandingHeader";
import LandingImage from "@/components/LandingImage";
import SiteFooter from "@/components/SiteFooter";
import { LANDING_IMAGES } from "@/lib/landingImages";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";
import { COMPANY_FREIGHT_BROKER_LICENSE } from "@/lib/companyInfo";
import {
  INSURANCE_ENABLED,
  INSURANCE_PRODUCT_NAME,
  INSURANCE_INSURER,
  INSURANCE_COVERAGE_LIMIT,
  INSURANCE_EXCLUSION_NOTE,
} from "@/lib/insuranceInfo";

// 랜딩(/)의 title·description은 app/layout.tsx(루트 metadata)에서 관리함 —
// 여기서 다시 title을 export하면 루트 값을 덮어써서 두 곳을 같이 고쳐야 하므로 두지 않음
//
// ⚠️ **쓰지 않기로 한 표현**(32차 확정): "예비 배차처", "계약 없이", "기존 거래처를 바꾸",
// "1톤~5톤"처럼 상한을 못박는 표현, "25톤"·"전 차종"처럼 대형을 약속하는 표현, "이사",
// "B2B", 고객 접점의 "화주". 포지셔닝이 "보조 배차처"에서 "정식 물류 파트너"로 바뀌었다.
//
// 🔴 **섹션 배경 교차 순서가 시안 리듬의 핵심**이다(다크 → 흰색 → 옅은 노랑 → 흰색 →
// 회색 → **옅은 노랑 → 흰색** → 다크. 뒤 두 개가 13차에 신설된 ⑥⑦). 섹션을 추가·이동할
// 때 이 교차가 깨지지 않는지 먼저 확인할 것.
// 레이아웃 값은 전부 `app/globals.css`의 "랜딩(/) 레이아웃" 블록에 모여 있다.
//
// ⚠️ **이미지 5종은 아직 자리표시자**다. 경로는 `lib/landingImages.ts` 한 곳에만 있으니
// 사진이 준비되면 그 파일만 채우면 된다(컴포넌트에 경로를 직접 적지 말 것).

// 히어로 하단 신뢰 배지. 누적 실적이 없는 신생사가 내세울 수 있는 검증 가능한 지표들.
//
// 🔴 **보험 줄은 `INSURANCE_ENABLED`가 켜졌을 때만 붙는다**(13차). 미가입 상태에서
// "보험 가입"이 보이면 허위·과장 광고다 — 34차에 고객 접점에서 전부 지웠던 이유도
// 같다(당시 증권이 이사화물 특별약관이라 일반화물 담보 여부가 확인되지 않았음).
// 🔴 **여기엔 한도 숫자를 넣지 말 것.** 금액이 들어가는 곳은 ⑦ 안전·책임 카드 한 곳뿐이다.
// 🔴 노출 제어 플래그를 새로 만들지 말 것 — 이 줄과 ⑦-3 카드를 같은 플래그 하나가
// 제어해야 한쪽만 켜지는 사고가 안 난다.
const TRUST_POINTS = [
  `화물자동차 운송주선사업 정식 허가업체 ${COMPANY_FREIGHT_BROKER_LICENSE}`,
  "세금계산서 발행 · 건별 정산 및 월정산 가능",
  "전국 배차망 연계 · 1톤부터 5톤 이상까지",
  ...(INSURANCE_ENABLED ? ["적재물배상책임보험 가입"] : []),
];

// "어떤 업체인가"가 아니라 "어떤 운송인가"로 제시한다.
// 업종을 나열하면 목록에 없는 업체가 "나는 대상이 아니다"라고 읽기 때문(32차 확정).
// 업종 정보 자체는 영업 DB와 내부 문서에 그대로 유지되며 랜딩에서만 뺐다.
const TRANSPORT_TYPES = [
  { title: "정기 납품", desc: "같은 구간을 주기적으로 오가는 운송" },
  { title: "긴급 출고", desc: "당일·익일 처리가 필요한 건" },
  { title: "창고·거점 이동", desc: "재고 이전, 센터 간 이동" },
  { title: "현장 납품", desc: "시공·설치 현장으로 직접 배송" },
  { title: "행사 반입·철수", desc: "전시·행사 장비의 왕복 운송" },
  { title: "대형 상품 배송", desc: "택배로 보내기 어려운 부피·중량 화물" },
];

// 고객이 배차처를 고를 때 실제로 던지는 질문 4개.
// ⚠️ 13차에 3·4번 설명을 **한 문장 약속**으로 줄이고 신설 섹션(⑦·⑥)으로 가는 앵커
// 링크를 붙였다 — 이 섹션은 "판단 기준(질문) + 약속"을 맡고, **방법과 절차는 ⑥·⑦이
// 맡는다**는 계층 분리다. 여기에 방법 설명을 다시 늘리면 두 곳이 같은 말을 하게 된다.
// ⚠️ 11차에서 5문항 → 4문항으로 합쳤다(사용자 확정) — 기존 "정산이 편한가?"와
// "다음 거래가 더 편한가?"가 결국 같은 이야기(반복 거래의 편의)라 시안이 한 장으로
// 묶었고, 그래야 2×2 그리드가 맞는다. 다시 5개로 늘리면 시안 레이아웃이 깨진다.
const VALUES = [
  {
    icon: LANDING_IMAGES.icons.dispatch,
    q: "차량이 잘 잡히는가?",
    a: "가능 차량을 빠르게 확인하고, 배차 확정 정보를 명확히 안내합니다.",
    link: null,
  },
  {
    icon: LANDING_IMAGES.icons.price,
    q: "운임이 납득 가능한가?",
    a: "거리·차량·상하차·시간·대기 조건을 기준으로 운임을 설명합니다.",
    link: null,
  },
  {
    icon: LANDING_IMAGES.icons.support,
    q: "문제 생기면 대응하는가?",
    a: "사진과 기사 확인으로 사실부터 확인합니다.",
    link: { href: "#safety", label: "책임 절차 보기" },
  },
  {
    icon: LANDING_IMAGES.icons.repeat,
    q: "반복 거래가 편한가?",
    a: "자주 쓰는 주소와 물품 조건을 저장해 다음 접수를 줄입니다.",
    link: { href: "#management", label: "운송관리 보기" },
  },
];

// 차량 형태 4종. ⚠️ `lib/constants.ts`의 `BODY_TYPES`(11종 — 냉장탑·냉동탑·크레인·
// 트레일러 등 포함)를 그대로 노출하지 않는다(원칙 50번). 취급 범위가 확실한 4종만
// 고른 로컬 배열이며, `/vehicles`의 `BODY_TYPES_SHOWN`과 같은 4종으로 맞춰져 있다.
//
// `descShort`는 모바일 전용 — 2×2 그리드에서 칸이 좁아 desc가 3줄로 늘어진다.
const VEHICLES = [
  { name: "카고", desc: "개방형 적재함, 일반 화물", descShort: "개방형 적재함", image: LANDING_IMAGES.vehicles.cargo },
  { name: "탑차", desc: "밀폐형 적재함, 우천·보안", descShort: "밀폐형 적재함", image: LANDING_IMAGES.vehicles.box },
  { name: "윙바디", desc: "측면 개방, 파렛트 적재", descShort: "측면 개방, 파렛트 적재", image: LANDING_IMAGES.vehicles.wing },
  { name: "리프트", desc: "지게차 없는 현장 상·하차", descShort: "지게차 없는 현장", image: LANDING_IMAGES.vehicles.lift },
];

// 이용 절차 3단계(28차 반영분). 각 항목의 두 줄은 시안의 줄바꿈을 그대로 따른 것이라
// 배열로 두고 <br />로 이어 붙인다.
const STEPS = [
  {
    n: "1",
    title: "문의·견적",
    desc: ["상차지·하차지·품목만 알려주시면", "차량과 운임을 확인해 연락드립니다."],
  },
  {
    n: "2",
    title: "배차 확정",
    desc: ["차량 종류와 운임 내역이 담긴 견적서를 보내드립니다.", "배차 확정 시 차량·기사 정보를 안내드립니다."],
  },
  {
    n: "3",
    title: "운송·정산",
    desc: ["운송 완료 후 인수증과 정산 내역이 남습니다.", "세금계산서 발행, 건별 정산 및 월정산 가능합니다."],
  },
];

// ⑥ 운송관리 섹션의 기능 4줄. 화면 이름과 순서는 실제 운송관리 좌측 메뉴 순서를 따른다
// (견적확인 → 배차·운송조회 → 정산확인 → 월별통계) — 캡처와 어긋나면 안 되기 때문.
const MANAGEMENT_FEATURES = [
  { title: "견적 확인", desc: "받으신 견적서를 화면에서 다시 보고, PDF로 내려받으실 수 있습니다." },
  { title: "배차·운송 조회", desc: "배차 확정과 상·하차 진행 상황을 확인하실 수 있습니다." },
  { title: "정산 확인", desc: "청구 내역, 세금계산서 발행일, 입금일이 기록으로 남습니다." },
  { title: "월별 통계", desc: "월별 운송 건수와 운임, 자주 쓰는 구간을 확인하실 수 있습니다." },
];

// ⑦ 안전·책임 카드. 🔴 **열 수가 항목 수를 따라간다** — 2항목이면 2열, 3항목이면 3열.
// 9/7 공개 시점의 실제 출시본은 **2항목**이므로 2항목 완성도를 우선한다.
//
// 🔴 보험 카드는 `INSURANCE_ENABLED`가 true일 때만 **배열에 들어간다** — display:none이
// 아니라 조건부 렌더링이어야 한다. 숨기기만 하면 페이지 소스에 남아 검색·스크래핑에 잡힌다.
// ⚠️ 보험 문구를 여기에 하드코딩하지 말 것. 값은 전부 `lib/insuranceInfo.ts`에서 온다.
const SAFETY_ITEMS = [
  {
    icon: LANDING_IMAGES.safety.record,
    title: "기록으로 남습니다",
    // ⚠️ 둘째 문장은 11차 운송관리 곁다리 카드에 있던 원문을 13차에 이관한 것이다 —
    // 이 회사가 하지 않겠다고 약속하는 것을 적은 문장이라 버리지 말 것.
    desc: "견적서, 배차 내역, 인수증, 정산 내역이 운송관리 화면에 남습니다. 전화와 문자로만 오가다 나중에 확인할 방법이 없는 일을 만들지 않겠습니다.",
    tags: ["견적서", "배차 내역", "인수증", "정산 내역"],
    rows: [] as { label: string; value: string }[],
  },
  {
    icon: LANDING_IMAGES.safety.process,
    title: "문제가 생기면 절차로 대응합니다",
    desc: "사진과 현장 상황, 기사 확인을 거쳐 접수하고, 중재 절차를 진행합니다.",
    tags: ["사진 확인", "현장 상황", "기사 확인", "중재 절차"],
    rows: [] as { label: string; value: string }[],
  },
  ...(INSURANCE_ENABLED
    ? [
        {
          icon: LANDING_IMAGES.safety.insurance,
          title: "적재물배상책임보험",
          desc: INSURANCE_EXCLUSION_NOTE,
          tags: [] as string[],
          // 값이 빈 항목은 줄 자체를 그리지 않는다(가입 직후 일부만 채워진 상태 대비)
          rows: [
            { label: "상품명", value: INSURANCE_PRODUCT_NAME },
            { label: "보험사", value: INSURANCE_INSURER },
            { label: "배상 한도", value: INSURANCE_COVERAGE_LIMIT },
          ].filter((r) => r.value),
        },
      ]
    : []),
];

export default function LandingPage() {
  return (
    <div className="portal-theme landing-page">
      <LandingHeader />

      {/* ── ① 히어로 (다크) ─────────────────────────────────────────────────
          데스크탑은 우측에 이미지가 배경으로 깔리고 좌측 텍스트 위로 그라데이션이 덮인다.
          🔴 모바일에서는 CSS(order)로 이미지가 맨 아래로 내려간다 —
          텍스트 → CTA → 계정 신청 링크 → 신뢰 3줄 → 이미지 순서를 지킬 것. */}
      <section className="landing-hero">
        <div className="landing-hero-media" aria-hidden="true">
          <LandingImage src={LANDING_IMAGES.hero.desktop} alt="" dark />
        </div>
        <div className="landing-hero-overlay" aria-hidden="true" />

        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <p className="landing-hero-eyebrow">화물자동차 운송주선사업 정식 허가업체</p>
            <h1 className="landing-hero-title">
              출발부터 도착까지,
              <br />
              화물운송을 확실하게 관리합니다
            </h1>
            <p className="landing-hero-sub">
              상·하차지와 품목만 알려주시면 차량과 운임을 확인해 연락드립니다.
              <br />
              견적서부터 월정산까지, 운송 내역이 기록으로 남습니다.
            </p>

            {/* 견적 → 전화 순서. 두 버튼은 동등 비중이고, "운송관리 계정 신청"은 보조 링크 */}
            <div className="landing-hero-actions">
              <Link href="/quote" className="landing-btn-primary">
                무료 견적 문의 <span aria-hidden="true">→</span>
              </Link>
              {/* 모바일에서 탭하면 바로 발신되도록 tel: 링크. 번호는 상수 참조(하드코딩 금지) */}
              <a href={`tel:${COMPANY_SUPPORT_PHONE}`} className="landing-btn-phone">
                전화 문의 {COMPANY_SUPPORT_PHONE}
              </a>
              {/* 보조 링크는 데스크탑에서 버튼 2개와 같은 줄에, 모바일에서는 세로로 쌓인
                  버튼 아래 가운데에 놓인다(CSS가 전환) */}
              <Link href="/apply" className="hero-secondary-link">
                운송관리 계정 신청 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* 신뢰 배지 — 누적 실적이 없는 신생사가 내세울 수 있는 검증 가능한 지표.
              ⚠️ 보험 언급을 추가하지 말 것(34차, 자세한 이유는 TRUST_POINTS 주석 참고).
              본문(.landing-hero-text)보다 넓게 잡아야 2열이 눌리지 않는다. */}
          <div className="landing-hero-trust-wrap">
            <ul className="hero-trust">
              {TRUST_POINTS.map((t) => (
                <li key={t}>
                  <span className="hero-trust-check" aria-hidden="true">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── ② 이런 운송을 맡고 있습니다 (흰색) ─────────────────────────────── */}
      <section className="landing-section landing-section-white">
        <div className="landing-inner landing-types">
          <div>
            <h2 className="landing-h2">
              이런 운송을
              <br />
              맡고 있습니다
            </h2>
            <p className="landing-sub">업종과 규모에 관계없이 문의해 주세요.</p>
            {/* 모바일에는 이 사진을 넣지 않는다 — 목록만으로 충분한데 세로가 길어짐(지시서 4-2) */}
            <div className="desktop-only">
              <LandingImage
                src={LANDING_IMAGES.transportTypes}
                alt="창고에서 지게차로 화물을 상차하는 모습"
                className="landing-types-media"
              />
            </div>
          </div>

          <div>
            <ul className="landing-list">
              {TRANSPORT_TYPES.map((t, i) => (
                <li key={t.title}>
                  {/* 번호 배지는 노란 원 + 검정 숫자(반전) — 색을 뒤집지 말 것 */}
                  <span className="landing-num num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="landing-list-title">{t.title}</h3>
                    <p className="landing-list-desc">{t.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            {/* 목록이 "취급 범위 한정"으로 읽히지 않도록 하는 문구 — 지우지 말 것 */}
            <p className="landing-types-note">
              목록에 없는 운송도 문의해 주세요. 가능 여부를 확인해 안내드립니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── ③ 위캐리를 선택하는 이유 (옅은 노랑) ───────────────────────────── */}
      <section className="landing-section landing-section-soft">
        <div className="landing-inner">
          <div className="landing-values-head">
            <h2 className="landing-h2">위캐리를 선택하는 이유</h2>
            <div className="landing-rule" aria-hidden="true" />
          </div>
          <div className="landing-values-grid">
            {VALUES.map((v) => (
              <div key={v.q} className="landing-value-card">
                <LandingImage src={v.icon} alt="" className="landing-value-icon" />
                <h3 className="landing-value-q">{v.q}</h3>
                <p className="landing-value-a">{v.a}</p>
                {/* 앵커 스크롤 오프셋은 31차의 `.portal-theme :target`이 이미 처리한다
                    (스티키 헤더가 대상 제목을 가리는 문제) — 섹션에 id만 붙이면 된다.
                    🔴 전역(html)에 새로 걸지 말 것: /admin/guide의 해시 앵커까지 밀린다. */}
                {v.link && (
                  <a href={v.link.href} className="landing-value-link">
                    {v.link.label}{" "}
                    <span className="landing-arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ④ 필요한 차량 형태로 배차해드립니다 (흰색) ─────────────────────── */}
      <section className="landing-section landing-section-white">
        <div className="landing-inner">
          <div className="landing-vehicles-head">
            <div>
              <h2 className="landing-h2">
                필요한 차량 형태로
                <br />
                배차해드립니다
              </h2>
              {/* 차량 범위 표현 기준(12차 확정): **"1톤부터 5톤 이상까지"**.
                  🔴 "이상" 한 단어가 금지와 허용을 가른다 — "1톤부터 5톤까지"는 상한을
                  못 박는 금지 표현이므로 "이상"을 절대 빼지 말 것.
                  ⚠️ "25톤"·"전 차종"도 쓰지 말 것(배차망으로 대형이 가능하긴 하나 아직
                  수월하지 않아 약속하지 않음).
                  ⚠️ **하한에 소형 차종명을 다시 붙이지 말 것**(12차에 뺐음) — 2021년 5월
                  단종되어 신차가 없고 전부 중고 운행분이라 배차 확보가 불확실하다.
                  못 잡는 차를 광고하면 첫 통화에서 신뢰를 잃는다. */}
              <p className="landing-sub">1톤부터 5톤 이상까지 다양한 차량에 배차가 가능합니다.</p>
            </div>
            <p className="landing-vehicles-aside">
              그 밖의 차량 형태가 필요하시면 문의해 주세요.
              <br />
              가능 여부를 확인해 안내드립니다.
            </p>
          </div>

          {/* 🔴 모바일에서도 2×2를 유지한다(가로 스크롤로 바꾸지 말 것) — 4종을
              한눈에 비교하는 것이 이 섹션의 목적이다(지시서 4-4) */}
          <div className="landing-vehicles-grid">
            {VEHICLES.map((v) => (
              <div key={v.name}>
                <LandingImage src={v.image} alt={`${v.name} 차량`} className="landing-vehicle-media" />
                <h3 className="landing-vehicle-name">{v.name}</h3>
                <p className="landing-vehicle-desc desktop-only">{v.desc}</p>
                <p className="landing-vehicle-desc mobile-only">{v.descShort}</p>
              </div>
            ))}
          </div>

          <Link href="/vehicles" className="landing-arrow-link">
            차량·요금 자세히 보기{" "}
            <span className="landing-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* ── ⑤ 이렇게 진행됩니다 (회색) ─────────────────────────────────────────
          ⚠️ 13차에 이 섹션에서 두 블록을 뺐다: **운송관리 곁다리 카드**(⑥ 독립 섹션으로
          승격 — 소개만 하고 갈 곳을 주지 않던 상태였음)와 **첫 거래 혜택 칩 4개**
          (적용 조건·기간이 확정되지 않은 한시 프로모션이라 표시광고 문제가 되고,
          나머지 칩 2개는 혜택이 아니라 ⑥·⑦과 겹치는 기능 설명이었음).
          🔴 혜택을 다시 쓰려면 **조건·기간을 확정한 뒤** 별도 차수로 설계할 것. */}
      <section className="landing-section landing-section-gray">
        <div className="landing-inner">
          <h2 className="landing-h2">이렇게 진행됩니다</h2>

          {/* 데스크탑은 가로 진행선, 모바일은 세로 진행선(CSS에서 전환) */}
          <div className="landing-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="landing-step">
                <span className="landing-step-badge num" aria-hidden="true">
                  {s.n}
                </span>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">
                  {s.desc.map((line, i) => (
                    <span key={line}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ⑥ 운송관리 (옅은 노랑) ─────────────────────────────────────────────
          13차 신설. 그 전에는 ⑤ 안의 곁다리 카드 하나로만 소개했고 **버튼이 없어
          클릭할 데가 없었다** — 소개는 하는데 갈 곳을 주지 않는 상태였음.
          🔴 옅은 노랑 배경 위에 직접 회색 텍스트(--text-muted)를 올리면 대비가 모자라므로
          설명문은 반드시 **흰 카드 안**에 넣는다.
          🔴 모바일 순서는 기능 4줄 → 캡처 → 버튼 → 배지다(CSS grid-template-areas가
          전환한다). 캡처를 맨 위에 두면 버튼이 한참 아래로 밀린다. */}
      <section id="management" className="landing-section landing-section-soft">
        <div className="landing-inner">
          <div className="landing-values-head">
            <h2 className="landing-h2">맡기신 운송, 화면에서 직접 확인하세요</h2>
            <p className="landing-sub">견적서부터 월정산까지, 전화하지 않아도 됩니다.</p>
          </div>

          <div className="landing-mgmt-card">
            <div className="landing-mgmt-media-wrap">
              {/* 캡처는 안에 글자가 있어서 모바일 전용 크롭을 따로 쓴다 —
                  데스크탑 자산(1240px)을 모바일 폭(320px)으로 줄이면 표 안 글자가 뭉개진다.
                  모바일 자산은 표가 아니라 **카드 뷰**를 찍는다(.mobile-row-card). */}
              <LandingImage
                src={LANDING_IMAGES.portal.desktop}
                mobileSrc={LANDING_IMAGES.portal.mobile}
                alt="운송관리 화면의 운송 목록 예시"
                className="landing-mgmt-media"
              />
              {/* 🔴 캡처 하단 페이드 — 표가 잘린 자리를 자연스럽게 흐린다 */}
              <div className="landing-mgmt-fade" aria-hidden="true" />
            </div>

            <ul className="landing-mgmt-features">
              {MANAGEMENT_FEATURES.map((f) => (
                <li key={f.title}>
                  <span className="landing-mgmt-check" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <h3 className="landing-mgmt-feature-title">{f.title}</h3>
                    <p className="landing-mgmt-feature-desc">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* 로그인(주) → 계정 신청(보조) 순서. 헤더의 `.btn`·`.btn-ghost`는 옐로 위에서
                묻히거나 테두리가 없어서 여기서도 쓰지 않고 전용 클래스를 둔다 */}
            <div className="landing-mgmt-actions">
              <Link href="/customer/login" className="landing-mgmt-btn">
                운송관리 로그인 <span aria-hidden="true">→</span>
              </Link>
              <Link href="/apply" className="landing-mgmt-btn-ghost">
                운송관리 계정 신청 <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* 🔴 "2~3시간"은 이 회사의 차별점이라 큰 숫자로 강조한다 — 회색 보조
                텍스트로 흘리지 말 것. 둘째 줄(접수 시간 단서)도 각주로 밀거나 접지
                않는다(`/vehicles`의 PRICING_NOTES와 같은 급). 운영시간은 상수 참조. */}
            <div className="landing-mgmt-notice">
              <span className="landing-mgmt-notice-lead num">2~3시간 이내</span>
              <span className="landing-mgmt-notice-body">
                신청 접수 후 계정을 발급해드립니다.
                <span className="landing-mgmt-notice-sub">
                  {COMPANY_SUPPORT_HOURS} 접수 기준 · 15시 이후 접수는 다음 영업일 오전 중 발급
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ⑦ 안전·책임 (흰색) ────────────────────────────────────────────────
          13차 신설. 🔴 카드 열 수는 항목 수를 따라간다(2항목 2열 / 3항목 3열).
          🔴 보험 카드는 `INSURANCE_ENABLED`가 false면 배열에 아예 들어가지 않는다 —
          숨기는 것이 아니라 렌더링하지 않는 것이다(SAFETY_ITEMS 주석 참고). */}
      <section id="safety" className="landing-section landing-section-white">
        <div className="landing-inner">
          <div className="landing-values-head">
            <h2 className="landing-h2">맡기신 화물에 대한 책임</h2>
            <p className="landing-sub">기록과 절차로 관리합니다.</p>
          </div>

          <div className={`landing-safety-grid landing-safety-grid-${SAFETY_ITEMS.length}`}>
            {SAFETY_ITEMS.map((item) => (
              <div key={item.title} className="landing-safety-card">
                <LandingImage src={item.icon} alt="" className="landing-safety-icon" />
                <h3 className="landing-safety-title">{item.title}</h3>
                {item.rows.length > 0 && (
                  <dl className="landing-safety-rows">
                    {item.rows.map((r) => (
                      <div key={r.label}>
                        <dt>{r.label}</dt>
                        <dd>{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {item.desc && <p className="landing-safety-desc">{item.desc}</p>}
                {item.tags.length > 0 && (
                  <div className="landing-safety-tags">
                    {item.tags.map((t) => (
                      <span key={t} className="landing-safety-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 하단 띠 — 허가 사실과 문의처를 한 줄로 붙인다.
              🔴 전화번호를 하드코딩하지 말 것(lib/contactInfo.ts 상수). 모바일에서
              탭하면 바로 발신되도록 tel: 링크. */}
          <div className="landing-safety-band">
            <p className="landing-safety-band-text">
              화물자동차 운송주선사업 정식 허가업체 · 허가번호 {COMPANY_FREIGHT_BROKER_LICENSE}
            </p>
            <a href={`tel:${COMPANY_SUPPORT_PHONE}`} className="landing-safety-band-tel">
              문제 발생 시 <span className="num">{COMPANY_SUPPORT_PHONE}</span>{" "}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── ⑧ 마감 CTA (다크) ──────────────────────────────────────────────── */}
      <section className="landing-section landing-section-dark">
        <div className="landing-inner landing-cta-final">
          <div>
            <h2 className="landing-cta-title">지금 바로 견적을 받아보세요</h2>
            <p className="landing-cta-sub">
              상·하차지와 품목만 알려주시면 확인해 연락드립니다.
              <br />
              고객센터 <span className="landing-cta-phone num">{COMPANY_SUPPORT_PHONE}</span> · {COMPANY_SUPPORT_HOURS}
            </p>
          </div>
          {/* 버튼 순서는 히어로와 동일하게 견적 → 전화 */}
          <div className="landing-cta-actions">
            <Link href="/quote" className="landing-btn-primary">
              무료 견적 문의 <span aria-hidden="true">→</span>
            </Link>
            <a href={`tel:${COMPANY_SUPPORT_PHONE}`} className="landing-btn-phone">
              전화 문의 {COMPANY_SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

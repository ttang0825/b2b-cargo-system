import Link from "next/link";
import PublicPageHeader from "@/components/PublicPageHeader";
import SiteFooter from "@/components/SiteFooter";
import { COMPANY_SUPPORT_PHONE, COMPANY_SUPPORT_HOURS } from "@/lib/contactInfo";
import { quoteStatusStyle } from "@/lib/quoteStatusLabels";
import { DISPATCH_ISSUE_STYLE, getDispatchStageStyle } from "@/lib/dispatchStage";

// 거래처 온보딩 안내(공개 화면). 계정을 발급받은 화주가 **첫 로그인에서 멈추는 것**을
// 막는 것이 이 화면의 전부다 — 반복될 문의 다섯 개(아이디를 이메일로 착각 / 아이폰에
// 설치 버튼이 없음 / 카톡 브라우저에서 설치 불가 / 비밀번호 셀프 재설정 경로 없음 /
// 상태 라벨의 뜻)에 문장 하나씩이 대응한다. **문장을 줄이면 그 문의가 그대로 돌아온다.**
//
// 🔴 **`/customer/guide` 를 따로 만들지 말 것**(사용자 확정) — 페이지는 하나이고
//    포털에서는 이 주소로 보내기만 한다. 두 벌을 두면 한쪽만 낡는다.
// 🔴 **`components/TopNav.tsx` 의 숨김 조건에 `/guide` 가 등록돼 있다**(원칙 11번) —
//    빼면 관리자 메뉴가 이 공개 화면 위에 얹혀서 나타난다(여러 번 겪은 버그).
// 🔴 **화주포털 부품(`.portal-v2` 스코프의 클래스·토큰)을 끌어오지 말 것** — 그 토큰은
//    `.portal-v2` 안에만 있어서 여기서는 색이 아예 안 나오고(PR #145 실측), 끌어오면
//    관리자 31화면이 함께 쓰는 CSS 가 딸려온다. 이 화면은 공개 화면 공용 클래스
//    (`container`·`card`·`page-*`)와 이 화면 전용 `.guide-*` 만 쓴다.
// 🔴 **화면 캡처 이미지를 넣지 않았다 — 의도다.** ① 화면을 고칠 때마다 낡고 ② 무겁고
//    ③ 실계정으로 찍으면 화주 상호·담당자 연락처가 **public 저장소에 박힌다.**
//    빈 자리표시자도 두지 않는다(미완성으로 보인다). 필요한 곳만 CSS 도식으로 대신한다.
// 🔴 **담당 영업자 이름·휴대폰·이메일을 넣지 말 것** — 이 저장소는 public 이다.
//    개별 안내는 영업이 문자로 보내는 자료가 맡고, 이 화면에는 고객센터 번호만 둔다.
// ⚠️ 한글 줄바꿈을 `<br />` 로 고정하지 않았다 — 서체를 CDN 에서 받아와 폭이 달라지면
//    엉뚱한 자리에서 끊긴다(37차). 줄바꿈은 `word-break: keep-all` 에 맡긴다.

// 🔴 상태 알약의 글자·색은 **화면이 쓰는 그 모듈에서 가져온다** — 여기에 문자열을
//    다시 적으면 라벨이 바뀔 때 안내만 조용히 낡는다. DB 값(`보류`·`실패`)은 절대
//    노출하지 않는다(`quoteStatusStyle` 이 화주용 글자로 바꿔 준다).
const QUOTE_FLOW = ["상담중", "보류", "견적제출", "수주", "실패"] as const;
const QUOTE_EMPHASIS = "견적제출";

function Pill({ label, color, bg, strong }: { label: string; color: string; bg: string; strong?: boolean }) {
  return (
    <span className={strong ? "guide-pill guide-pill-strong" : "guide-pill"} style={{ color, background: bg }}>
      {label}
    </span>
  );
}

const MENUS: { label: string; desc: string }[] = [
  { label: "홈", desc: "진행 중인 운송, 최근 견적, 공지사항을 한 화면에서 확인" },
  { label: "발주 요청", desc: "새 운송을 접수. 저장해 둔 배송지·화물 정보를 불러올 수 있음" },
  { label: "견적 확인", desc: "견적 금액 확인, 승인, 견적서 PDF 출력" },
  { label: "배차·운송 조회", desc: "접수 → 배차완료 → 운송완료 진행 상황 확인" },
  { label: "정산·결제내역", desc: "청구금액, 세금계산서 발행일, 입금일 확인" },
  { label: "월별 통계", desc: "월별 실적, 평균 건당 운임, 자주 쓰는 구간, 엑셀 다운로드" },
  { label: "배송지·화물 관리", desc: "자주 쓰는 상·하차지와 화물 정보를 미리 저장" },
  { label: "담당자 정보", desc: "우리 회사 담당자 연락처 확인 및 수정" },
];

const USAGE: { label: string; desc: string }[] = [
  {
    label: "발주 요청",
    desc:
      "상차지·하차지, 품목, 톤수, 차량형태, 희망 상·하차 일시를 입력하고 보냅니다. 자주 쓰는 주소는 「배송지」에 저장해 두면 다음 발주부터 불러쓸 수 있습니다",
  },
  {
    label: "견적 확인",
    desc:
      "위캐리가 운임을 넣으면 상태가 「견적 도착」으로 바뀝니다. 금액을 확인하고 승인하시면 배차가 시작됩니다. 견적서는 PDF로 출력할 수 있습니다",
  },
  { label: "배차·운송 조회", desc: "지금 어느 단계인지 화면에서 바로 보입니다" },
  { label: "정산·결제내역", desc: "건별 청구금액과 세금계산서 발행일·입금일을 확인합니다" },
  {
    label: "월별 통계",
    desc:
      "월별 건수와 금액, 평균 건당 운임, 자주 쓰는 구간을 보고 운송·정산 내역을 엑셀로 내려받을 수 있습니다",
  },
];

const INSTALL: { device: string; how: string }[] = [
  { device: "PC", how: "크롬·엣지에서 로그인 화면이나 홈 화면 오른쪽 위의 「앱으로 설치」 버튼" },
  { device: "안드로이드", how: "같은 자리의 「홈 화면에 추가」 버튼" },
  { device: "아이폰", how: "버튼으로는 설치되지 않습니다. 사파리 아래쪽 공유 버튼 → 「홈 화면에 추가」" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "직원 여러 명이 각자 계정을 쓸 수 있나요?",
    a: "네. 한 회사에 계정을 여러 개 발급할 수 있고, 계정마다 담당자 정보가 따로 저장됩니다. 필요한 인원과 연락처를 담당자에게 알려 주세요.",
  },
  {
    q: "급한 건은 시스템 말고 전화로 넣어도 되나요?",
    a: "됩니다. 전화로 주신 건도 위캐리가 시스템에 등록하기 때문에 견적·배차·정산 내역은 똑같이 화면에서 확인하실 수 있습니다.",
  },
  {
    q: "발주를 넣었는데 반려됐다고 나옵니다.",
    a: "「견적 확인」 화면에 「접수 반려」 표시와 사유가 함께 나옵니다. 사유를 보고 수정해서 다시 넣으시거나, 담당자에게 문의해 주세요.",
  },
  {
    q: "화면에 보이는 금액이 부가세 포함인가요?",
    a: "기본 표시는 공급가액이고, 바로 옆에 부가세 포함 금액이 함께 표시됩니다.",
  },
  {
    q: "아이디나 비밀번호를 잊어버렸습니다.",
    a: `화면에서 직접 찾을 수 없습니다. 담당자 또는 고객센터 ${COMPANY_SUPPORT_PHONE}으로 연락 주시면 확인 후 임시비밀번호를 재발급해 드립니다.`,
  },
  {
    q: "인터넷이 끊기면 지난 내역을 볼 수 있나요?",
    a: "아니요. 견적·배차·정산 금액은 항상 최신값을 보여드려야 하기 때문에 오프라인에서는 조회되지 않습니다. 연결되면 바로 정상 작동합니다.",
  },
];

export default function GuidePage() {
  return (
    <div className="portal-theme guide-page">
      <PublicPageHeader />

      <main className="container guide-main">
        {/* ── ① 머리 ─────────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">운송관리 시스템 이용안내</h1>
            <p className="page-desc guide-lead">
              계정 발급부터 첫 발주까지 네 단계입니다. 처음 한 번만 5분 정도 걸리고, 그 다음부터는 발주 화면
              하나만 쓰시면 됩니다.
            </p>
          </div>
        </div>

        <div className="guide-hero-actions">
          {/*
            🔴 **이 링크만 `<a href>` 다 — `next/link` 로 되돌리지 말 것**(PR #130).
               운송관리는 설치형 앱이고 서비스워커 구역이 `/customer` 인데 이 화면(`/guide`)은
               그 **구역 밖**이다. 클라이언트 전환으로 넘어가면 문서를 새로 받지 않아서 그
               문서는 영영 서비스워커의 제어를 못 받고(실측 `controller` 가 `null`), 크롬이
               설치 조건 미달로 보아 ① 설치 신호를 안 쏘고 ② 「홈 화면에 추가」가 앱이 아니라
               **바로가기**를 만든다. 2026-09-08 에 실제로 신고된 증상이고, 랜딩 헤더가 같은
               이유로 같은 예외를 쓰고 있다. **화면은 멀쩡해 보이고 설치만 조용히 망가진다.**
            🟢 아래 「계정 신청하기」는 공개 화면끼리라 해당 없다 — 그래서 한쪽만 `<a>` 다.
          */}
          <a href="/customer/login" className="guide-btn guide-btn-dark">
            운송관리 로그인
          </a>
          <Link href="/apply" className="guide-btn guide-btn-yellow">
            계정 신청하기
          </Link>
        </div>

        {/* ── ② 4단계 ────────────────────────────────────────────── */}
        <section className="guide-section" aria-labelledby="guide-steps">
          <h2 className="guide-h2" id="guide-steps">
            시작하기 · 네 단계
          </h2>

          <div className="card guide-card">
            <div className="guide-step-no">01</div>
            <h3 className="guide-h3">계정 신청</h3>
            <ol className="guide-ol">
              <li>
                이 홈페이지에서 <b>「운송관리 계정 신청」</b>을 작성하시거나, 담당자에게 말씀만 주셔도 저희가
                대신 등록해 드립니다
              </li>
              <li>상호·사업자등록번호·주소, 담당자 이름·연락처를 입력합니다</li>
              <li>
                확인 후 위캐리가 <b>아이디와 임시비밀번호</b>를 전달해 드립니다
              </li>
            </ol>
            {/* 🔴 문의 1번(아이디를 이메일로 착각한다)에 대응하는 문장이다. 지우지 말 것.
                🔴 **아이디 형식(접두어·자릿수)을 여기에 적지 말 것**(사용자 확정 2026-09-14).
                   기술적으로는 안전한 값이지만 — 로그인 실패 응답이 「없는 아이디」와
                   「비밀번호 틀림」으로 갈리지 않아 형식을 알아도 계정 유무를 가릴 수 없다 —
                   **공개 화면에 적지 않기로 정했다.** 「이메일이 아니다」까지가 이 문장의
                   몫이고, 실제 아이디는 발급할 때 그대로 전달된다. */}
            <p className="guide-note">
              ⚠️ <b>아이디는 이메일이 아닙니다.</b> 위캐리가 발급해 드리는 전용 아이디이고, 이메일 주소로는
              로그인되지 않습니다. 발급받으신 아이디를 그대로 입력해 주세요.
            </p>
          </div>

          <div className="card guide-card">
            <div className="guide-step-no">02</div>
            <h3 className="guide-h3">첫 로그인</h3>
            <ol className="guide-ol">
              <li>
                전달받은 <b>아이디와 임시비밀번호</b>로 로그인합니다
              </li>
              <li>
                비밀번호 변경 화면이 <b>자동으로 뜹니다.</b> 새 비밀번호를 정해야 다음으로 넘어갑니다
              </li>
              <li>변경이 끝나면 바로 홈 화면이 열립니다</li>
            </ol>
            {/* 🔴 문의 4번(비밀번호를 화면에서 찾으려 한다)에 대응한다 — 셀프 재설정 경로가
                없는 것은 버그가 아니라 설계다(관리자가 재발급한다). 지우지 말 것. */}
            <p className="guide-note">
              <b>비밀번호를 잊으셨다면</b> 화면에서 직접 재설정할 수 없습니다. 담당자 또는 고객센터{" "}
              <b>{COMPANY_SUPPORT_PHONE}</b>으로 알려 주시면 임시비밀번호를 다시 발급해 드립니다.
            </p>
          </div>

          <div className="card guide-card">
            <div className="guide-step-no">03</div>
            <h3 className="guide-h3">
              앱으로 설치하기 <span className="guide-h3-sub">선택 · 권장</span>
            </h3>
            <p className="guide-p">
              설치하면 바탕화면이나 휴대폰 홈 화면에 아이콘이 생기고, 주소창 없는 전용 창으로 열립니다. 기기마다
              방법이 다릅니다.
            </p>

            {/* 🔴 캡처 이미지가 아니라 CSS 도식이다(이미지 파일 0건) — 「버튼이 오른쪽 위에
                있다」만 보이면 충분하고, 이 도식은 화면을 고쳐도 낡지 않는다. */}
            <div className="guide-mock" aria-hidden="true">
              <div className="guide-mock-bar">
                <span className="guide-mock-dot" />
                <span className="guide-mock-dot" />
                <span className="guide-mock-dot" />
              </div>
              <div className="guide-mock-body">
                <div className="guide-mock-title" />
                <div className="guide-mock-btn">앱으로 설치</div>
              </div>
            </div>

            <dl className="guide-dl">
              {INSTALL.map((row) => (
                <div className="guide-dl-row" key={row.device}>
                  <dt>{row.device}</dt>
                  <dd>{row.how}</dd>
                </div>
              ))}
            </dl>

            {/* 🔴 문의 3번(카톡 링크로 열어서 설치가 안 된다)에 대응한다. 카톡 자체
                브라우저에는 설치 메뉴가 아예 없다 — 고객이 잘못 누른 것이 아니다. */}
            <p className="guide-note">
              ⚠️ <b>카카오톡으로 받은 링크는 그대로 설치되지 않습니다.</b> 카카오톡 안에서 열면 카톡 자체
              브라우저가 뜨는데 거기에는 설치 메뉴가 없습니다. 안내가 나오면 <b>「기본 브라우저로 열기」</b>를
              누른 뒤 설치해 주세요.
            </p>
          </div>

          <div className="card guide-card">
            <div className="guide-step-no">04</div>
            <h3 className="guide-h3">발주부터 정산까지</h3>
            <dl className="guide-dl">
              {USAGE.map((row) => (
                <div className="guide-dl-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── ③ 메뉴 8종 ─────────────────────────────────────────── */}
        <section className="guide-section" aria-labelledby="guide-menus">
          <h2 className="guide-h2" id="guide-menus">
            메뉴 한눈에 보기
          </h2>
          <p className="guide-p">로그인하면 왼쪽(휴대폰은 위쪽)에 이 메뉴들이 보입니다.</p>

          {/* 🔴 원칙 13번 — 데스크탑 표와 모바일 카드는 **완전히 별개 JSX** 다.
              항목을 더하거나 뺄 때 한쪽만 고치면 조용히 갈린다(둘 다 같은 `MENUS` 를
              돌리게 해 두었으니 배열만 고치면 양쪽이 함께 바뀐다). */}
          <div className="card guide-card table-scroll desktop-only">
            <table className="guide-table">
              <thead>
                <tr>
                  <th scope="col">메뉴</th>
                  <th scope="col">여기서 하는 일</th>
                </tr>
              </thead>
              <tbody>
                {MENUS.map((m) => (
                  <tr key={m.label}>
                    <th scope="row">{m.label}</th>
                    <td>{m.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-only">
            {MENUS.map((m) => (
              <div className="card guide-card guide-menu-card" key={m.label}>
                <div className="guide-menu-name">{m.label}</div>
                <div className="guide-menu-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ④ 진행 상태 ────────────────────────────────────────── */}
        <section className="guide-section" aria-labelledby="guide-status">
          <h2 className="guide-h2" id="guide-status">
            진행 상태 보는 법
          </h2>

          <div className="card guide-card">
            <h3 className="guide-h3">견적 상태</h3>
            <p className="guide-p">
              위캐리가 운임을 넣으면 「견적 도착」이 됩니다. 승인하시면 「운송 확정」으로 바뀝니다.
            </p>
            <div className="guide-pills">
              {QUOTE_FLOW.map((s) => {
                const st = quoteStatusStyle(s);
                return <Pill key={s} label={st.label} color={st.color} bg={st.bg} strong={s === QUOTE_EMPHASIS} />;
              })}
            </div>
          </div>

          <div className="card guide-card">
            <h3 className="guide-h3">배차·운송 상태</h3>
            <p className="guide-p">
              차량이 잡히면 「배차완료」, 하차까지 끝나면 「운송완료」입니다. 문제가 생긴 건은 따로 표시됩니다.
            </p>
            <div className="guide-pills">
              {([0, 1, 2] as const).map((stage) => {
                const st = getDispatchStageStyle(stage);
                return <Pill key={st.label} label={st.label} color={st.color} bg={st.bg} strong={stage === 2} />;
              })}
              <Pill label={DISPATCH_ISSUE_STYLE.label} color={DISPATCH_ISSUE_STYLE.color} bg={DISPATCH_ISSUE_STYLE.bg} />
            </div>
          </div>

          <div className="card guide-card">
            <h3 className="guide-h3">금액 표시</h3>
            <p className="guide-p">
              기본 표시는 <b>공급가액</b>이고, 옆에 부가세 포함 금액이 함께 나옵니다. 세금계산서는 공급가액
              기준으로 발행됩니다.
            </p>
          </div>
        </section>

        {/* ── ⑤ FAQ ──────────────────────────────────────────────── */}
        <section className="guide-section" aria-labelledby="guide-faq">
          <h2 className="guide-h2" id="guide-faq">
            자주 묻는 질문
          </h2>
          <div className="card guide-card">
            {FAQS.map((f) => (
              <div className="guide-faq-row" key={f.q}>
                <div className="guide-faq-q">Q. {f.q}</div>
                <div className="guide-faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ⑥ 문의 ─────────────────────────────────────────────── */}
        <section className="guide-section" aria-labelledby="guide-contact">
          <h2 className="guide-h2" id="guide-contact">
            문의
          </h2>
          <div className="card guide-card guide-contact">
            <p className="guide-p">운송관리 이용 중 막히시는 부분이 있으면 언제든 연락 주세요.</p>
            <a className="guide-tel" href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`}>
              고객센터 {COMPANY_SUPPORT_PHONE}
            </a>
            <p className="guide-note guide-note-plain">{COMPANY_SUPPORT_HOURS} (주말·공휴일 휴무)</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

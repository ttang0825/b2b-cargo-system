import { Fragment } from "react";
import Link from "next/link";
import PublicPageHeader from "@/components/PublicPageHeader";
import SiteFooter from "@/components/SiteFooter";
import { quoteStatusStyle } from "@/lib/quoteStatusLabels";
import { DISPATCH_ISSUE_STYLE, getDispatchStageStyle } from "@/lib/dispatchStage";
import {
  GUIDE_GROUPS,
  GUIDE_PUBLIC_LEAD,
  GUIDE_PUBLIC_TITLE,
  guideItemsFor,
  type GuideBlock,
  type GuideGroupKey,
  type GuideItem,
} from "@/lib/guideContent";

// 거래처 온보딩 안내(공개 화면). 계정을 발급받은 화주가 **첫 로그인에서 멈추는 것**을
// 막는 것이 이 화면의 전부다 — 반복될 문의 다섯 개(아이디를 이메일로 착각 / 아이폰에
// 설치 버튼이 없음 / 카톡 브라우저에서 설치 불가 / 비밀번호 셀프 재설정 경로 없음 /
// 상태 라벨의 뜻)에 문장 하나씩이 대응한다. **문장을 줄이면 그 문의가 그대로 돌아온다.**
//
// 🔴 **본문은 이 파일에 없다 — `lib/guideContent.ts` 가 유일 정의처다**(2026-09-14).
//    이 화면은 그중 `public`·`both` 항목만 **한 장 스크롤**로 그린다. 포털의
//    `/customer/guide` 가 같은 글을 항목 선택 방식으로 그린다. 🔴 **본문을 여기에
//    다시 적지 말 것** — 그러면 두 화면이 갈리고, 그게 PR #148 이 걱정하던 바로 그것이다.
//
// 🔴 **한 장 스크롤을 항목 선택 방식으로 바꾸지 말 것**(사용자 확정 2026-09-14).
//    불편하다고 한 것은 **포털 매뉴얼**이고, 이 화면은 처음 오는 사람이 **네 단계를
//    순서대로** 읽는 자리다.
// 🔴 **`components/TopNav.tsx` 의 숨김 조건에 `/guide` 가 등록돼 있다**(원칙 11번) —
//    빼면 관리자 메뉴가 이 공개 화면 위에 얹혀서 나타난다(여러 번 겪은 버그).
// 🔴 **화주포털 부품(`.portal-v2` 스코프의 클래스·토큰)을 끌어오지 말 것** — 그 토큰은
//    `.portal-v2` 안에만 있어서 여기서는 색이 아예 안 나오고(PR #145 실측), 끌어오면
//    관리자 31화면이 함께 쓰는 CSS 가 딸려온다. 이 화면은 공개 화면 공용 클래스
//    (`container`·`card`·`page-*`)와 이 화면 전용 `.guide-*` 만 쓴다.
// 🔴 **화면 캡처 이미지를 넣지 않았다 — 의도다.** ① 화면을 고칠 때마다 낡고 ② 무겁고
//    ③ 실계정으로 찍으면 화주 상호·담당자 연락처가 **public 저장소에 박힌다.**
//    빈 자리표시자도 두지 않는다(미완성으로 보인다). 필요한 곳만 CSS 도식으로 대신한다.
// ⚠️ 한글 줄바꿈을 `<br />` 로 고정하지 않았다 — 서체를 CDN 에서 받아와 폭이 달라지면
//    엉뚱한 자리에서 끊긴다(37차). 줄바꿈은 `word-break: keep-all` 에 맡긴다.

// 🔴 강조는 **`<b>`** 로 그린다 — 정의처로 옮기기 전 이 화면이 쓰던 태그이고, 바꾸면
//    렌더링 결과가 달라진다(`lib/legal/` 쪽은 `<strong>` 이라 서로 다른 것이 정상이다).
//    빈 조각을 버리는 것도 같은 이유다(문장이 `**` 로 시작하면 빈 조각이 하나 생긴다).
function inline(text: string) {
  return text
    .split("**")
    .map((part, i) => (part === "" ? null : i % 2 === 1 ? <b key={i}>{part}</b> : part));
}

// 🔴 상태 알약의 글자·색은 **화면이 쓰는 그 모듈에서 가져온다** — 정의처에 문자열을
//    적으면 라벨이 바뀔 때 안내만 조용히 낡는다. DB 값(`보류`·`실패`)은 절대 노출하지
//    않는다(`quoteStatusStyle` 이 화주용 글자로 바꿔 준다).
const QUOTE_FLOW = ["상담중", "보류", "견적제출", "수주", "실패"] as const;
const QUOTE_EMPHASIS = "견적제출";

function Pill({ label, color, bg, strong }: { label: string; color: string; bg: string; strong?: boolean }) {
  return (
    <span className={strong ? "guide-pill guide-pill-strong" : "guide-pill"} style={{ color, background: bg }}>
      {label}
    </span>
  );
}

function Pills({ set }: { set: "quote" | "dispatch" }) {
  if (set === "quote") {
    return (
      <div className="guide-pills">
        {QUOTE_FLOW.map((s) => {
          const st = quoteStatusStyle(s);
          return <Pill key={s} label={st.label} color={st.color} bg={st.bg} strong={s === QUOTE_EMPHASIS} />;
        })}
      </div>
    );
  }
  return (
    <div className="guide-pills">
      {([0, 1, 2] as const).map((stage) => {
        const st = getDispatchStageStyle(stage);
        return <Pill key={st.label} label={st.label} color={st.color} bg={st.bg} strong={stage === 2} />;
      })}
      <Pill label={DISPATCH_ISSUE_STYLE.label} color={DISPATCH_ISSUE_STYLE.color} bg={DISPATCH_ISSUE_STYLE.bg} />
    </div>
  );
}

/** 카드 안에 들어가는 블록들. ⚠️ `table` 은 여기서 그리지 않는다 — 데스크탑 표와
 *  모바일 카드가 **서로 다른 카드**라(원칙 13번) 섹션 쪽에서 직접 그린다. */
function Blocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return (
              <p key={i} className="guide-p">
                {inline(b.text)}
              </p>
            );
          case "ol":
            return (
              <ol key={i} className="guide-ol">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          case "note":
            return (
              <p key={i} className={b.plain ? "guide-note guide-note-plain" : "guide-note"}>
                {inline(b.text)}
              </p>
            );
          case "dl":
            return (
              <dl key={i} className="guide-dl">
                {b.rows.map((row) => (
                  <div className="guide-dl-row" key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{inline(row.desc)}</dd>
                  </div>
                ))}
              </dl>
            );
          case "faq":
            // ⚠️ 감싸개를 두지 않는다 — 원래 카드 바로 아래에 행이 오던 구조다.
            return (
              <Fragment key={i}>
                {b.rows.map((f) => (
                  <div className="guide-faq-row" key={f.q}>
                    <div className="guide-faq-q">Q. {f.q}</div>
                    <div className="guide-faq-a">{f.a}</div>
                  </div>
                ))}
              </Fragment>
            );
          case "pills":
            return <Pills key={i} set={b.set} />;
          case "mock":
            // 🔴 캡처 이미지가 아니라 CSS 도식이다(이미지 파일 0건) — 「버튼이 오른쪽 위에
            //    있다」만 보이면 충분하고, 이 도식은 화면을 고쳐도 낡지 않는다.
            return (
              <div key={i} className="guide-mock" aria-hidden="true">
                <div className="guide-mock-bar">
                  <span className="guide-mock-dot" />
                  <span className="guide-mock-dot" />
                  <span className="guide-mock-dot" />
                </div>
                <div className="guide-mock-body">
                  <div className="guide-mock-title" />
                  <div className="guide-mock-btn">{b.buttonLabel}</div>
                </div>
              </div>
            );
          case "tel":
            return (
              <a key={i} className="guide-tel" href={`tel:${b.number}`}>
                {b.label}
              </a>
            );
          case "table":
            return null;
        }
      })}
    </>
  );
}

function Heading({ item }: { item: GuideItem }) {
  return (
    <h3 className="guide-h3">
      {item.titleSub ? `${item.title} ` : item.title}
      {item.titleSub && <span className="guide-h3-sub">{item.titleSub}</span>}
    </h3>
  );
}

/** 묶음 섹션의 `aria-labelledby` 대상 id */
const GROUP_ANCHOR: Record<GuideGroupKey, string> = {
  start: "guide-steps",
  status: "guide-status",
};

export default function GuidePage() {
  const items = guideItemsFor("public");

  // 묶음(`group`)에 속한 항목은 **그 묶음의 첫 항목 자리**에서 섹션 하나로 한꺼번에
  // 그리고, 나머지는 건너뛴다. 그래서 `lib/guideContent.ts` 의 배열 순서가 곧 이 화면의
  // 순서다 — 🔴 **항목을 더하면 순서만 맞추면 되고 이 파일은 손댈 필요가 없다.**
  const drawn = new Set<GuideGroupKey>();

  return (
    <div className="portal-theme guide-page">
      <PublicPageHeader />

      <main className="container guide-main">
        {/* ── ① 머리 ─────────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{GUIDE_PUBLIC_TITLE}</h1>
            <p className="page-desc guide-lead">{GUIDE_PUBLIC_LEAD}</p>
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

        {items.map((item) => {
          // ── 묶음 섹션(시작하기 네 단계 · 진행 상태 보는 법) ──────────────
          if (item.group) {
            if (drawn.has(item.group)) return null;
            drawn.add(item.group);
            const group = item.group;
            const members = items.filter((i) => i.group === group);
            const anchor = GROUP_ANCHOR[group];
            return (
              <section className="guide-section" aria-labelledby={anchor} key={anchor}>
                <h2 className="guide-h2" id={anchor}>
                  {GUIDE_GROUPS[group]}
                </h2>
                {members.map((m) => (
                  <div className="card guide-card" key={m.id}>
                    {m.step && <div className="guide-step-no">{m.step}</div>}
                    <Heading item={m} />
                    <Blocks blocks={m.blocks} />
                  </div>
                ))}
              </section>
            );
          }

          // ── 혼자 한 섹션을 쓰는 항목 ────────────────────────────────────
          const anchor = `guide-${item.id}`;
          const table = item.blocks.find((b) => b.type === "table");
          const rest = item.blocks.filter((b) => b.type !== "table");
          // 전화 링크가 있으면 문의 카드다 — id 가 아니라 **내용**으로 가른다.
          const isContact = item.blocks.some((b) => b.type === "tel");

          return (
            <section className="guide-section" aria-labelledby={anchor} key={item.id}>
              <h2 className="guide-h2" id={anchor}>
                {item.title}
              </h2>

              {table ? (
                <>
                  {/* 표가 있는 항목은 안내 문단이 **카드 밖**에 온다 */}
                  <Blocks blocks={rest} />
                  {/* 🔴 원칙 13번 — 데스크탑 표와 모바일 카드는 **완전히 별개 JSX** 다.
                      둘 다 같은 `rows` 를 돌리게 해 두었으니 정의처만 고치면 함께 바뀐다. */}
                  <div className="card guide-card table-scroll desktop-only">
                    <table className="guide-table">
                      <thead>
                        <tr>
                          <th scope="col">{table.head[0]}</th>
                          <th scope="col">{table.head[1]}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((r) => (
                          <tr key={r.label}>
                            <th scope="row">{r.label}</th>
                            <td>{r.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mobile-only">
                    {table.rows.map((r) => (
                      <div className="card guide-card guide-menu-card" key={r.label}>
                        <div className="guide-menu-name">{r.label}</div>
                        <div className="guide-menu-desc">{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={isContact ? "card guide-card guide-contact" : "card guide-card"}>
                  <Blocks blocks={item.blocks} />
                </div>
              )}
            </section>
          );
        })}
      </main>

      <SiteFooter />
    </div>
  );
}

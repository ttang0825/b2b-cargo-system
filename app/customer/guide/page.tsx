"use client";

import { Fragment, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GuideIcon from "@/components/GuideIcon";
import { quoteStatusStyle } from "@/lib/quoteStatusLabels";
import { DISPATCH_ISSUE_STYLE, getDispatchStageStyle } from "@/lib/dispatchStage";
import {
  GUIDE_PORTAL_LEAD,
  GUIDE_PORTAL_TITLE,
  guideItemsFor,
  type GuideBlock,
} from "@/lib/guideContent";

// 화주포털 이용가이드. **본문은 여기 없다 — `lib/guideContent.ts` 가 유일 정의처다.**
// 이 화면은 그중 `portal`·`both` 항목을 **항목 선택 방식**으로 그린다.
//
// 🔴 **왜 공개 `/guide` 로 보내지 않는가**(사용자 확정 2026-09-14) — 그 화면은
//    `PublicPageHeader`(로고만)를 쓰는 공개 화면이라, 로그인한 화주가 포털에서 들어가면
//    **로고를 눌렀을 때 포털이 아니라 랜딩으로 나간다.** 셸 밖으로 나간 것이라 돌아올
//    길이 없다. 이 화면은 포털 셸 안이므로 로고가 포털 홈으로 간다 — **그것이 이 화면을
//    만든 이유 전부다.** 🔴 포털 홈의 `/guide` 링크를 되살리지 말 것.
//
// 🔴 **항목 선택은 `?topic=` 쿼리스트링이고 라우트는 하나다.** 항목마다 라우트를 만들면
//    프리렌더가 항목 수만큼 늘고 항목을 더할 때마다 파일이 는다. 쿼리스트링이면
//    새로고침·링크 공유·뒤로가기가 전부 그대로 동작한다.
// 🔴 **`<Link>` 로 옮긴다(= history push)** — `replace` 로 바꾸면 뒤로가기가 목록이 아니라
//    **포털 홈으로** 튄다.
// 🔴 **항목 고르기를 네이티브 `<select>` 로 만들지 말 것**(원칙 57번).
//
// 🔴 **모바일은 목록과 본문을 같이 그리지 않는다** — 합치면 이번에 없애려던 긴 스크롤로
//    돌아간다. 가르는 일은 CSS 가 한다(`.pv2-guide-open`, ≤700px) — 화면 폭을 JS 로 재면
//    첫 그림에서 잘못된 쪽이 한 번 번쩍인다.
// ⚠️ 상단 「←」(PR #129)가 이 화면에 이미 그려지고 `router.back()` 이라 **「목록으로」
//    버튼을 따로 만들지 않았다.** 만들면 같은 줄에 뒤로가기가 둘이 된다.

function inline(text: string) {
  return text
    .split("**")
    .map((part, i) => (part === "" ? null : i % 2 === 1 ? <b key={i}>{part}</b> : part));
}

// 🔴 상태 알약의 글자·색은 화면이 쓰는 그 모듈에서 가져온다 — 정의처에 적으면 DB 값
//    (`보류`·`실패`)이 박히고 라벨이 바뀔 때 안내만 조용히 낡는다.
const QUOTE_FLOW = ["상담중", "보류", "견적제출", "수주", "실패"] as const;
const QUOTE_EMPHASIS = "견적제출";

function Pill({ label, color, bg, strong }: { label: string; color: string; bg: string; strong?: boolean }) {
  return (
    <span
      className={strong ? "pv2-guide-pill pv2-guide-pill-strong" : "pv2-guide-pill"}
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

function Pills({ set }: { set: "quote" | "dispatch" }) {
  if (set === "quote") {
    return (
      <div className="pv2-guide-pills">
        {QUOTE_FLOW.map((s) => {
          const st = quoteStatusStyle(s);
          return <Pill key={s} label={st.label} color={st.color} bg={st.bg} strong={s === QUOTE_EMPHASIS} />;
        })}
      </div>
    );
  }
  return (
    <div className="pv2-guide-pills">
      {([0, 1, 2] as const).map((stage) => {
        const st = getDispatchStageStyle(stage);
        return <Pill key={st.label} label={st.label} color={st.color} bg={st.bg} strong={stage === 2} />;
      })}
      <Pill label={DISPATCH_ISSUE_STYLE.label} color={DISPATCH_ISSUE_STYLE.color} bg={DISPATCH_ISSUE_STYLE.bg} />
    </div>
  );
}

function Blocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return (
              <p key={i} className="pv2-guide-p">
                {inline(b.text)}
              </p>
            );
          case "ol":
            return (
              <ol key={i} className="pv2-guide-ol">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          case "note": {
            // 🔴 `plain` 은 상자 없는 작은 글씨라 `tone` 을 무시한다(공개 화면과 같은 규칙).
            const cls = b.plain
              ? "pv2-guide-note pv2-guide-note-plain"
              : b.tone === "tip"
                ? "pv2-guide-note pv2-guide-note-tip"
                : "pv2-guide-note";
            return (
              <p key={i} className={cls}>
                {inline(b.text)}
              </p>
            );
          }
          case "steps":
            return (
              <ol key={i} className="pv2-guide-steps">
                {b.items.map((it, j) => (
                  <li className="pv2-guide-step" key={it.title}>
                    <span className="pv2-guide-step-badge" aria-hidden="true">
                      {j + 1}
                    </span>
                    <span className="pv2-guide-step-body">
                      <span className="pv2-guide-step-title">{it.title}</span>
                      <span className="pv2-guide-step-desc">{inline(it.desc)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "cards":
            return (
              <div key={i} className="pv2-guide-tiles">
                {b.rows.map((r) => (
                  <div className="pv2-guide-tile" key={r.label}>
                    <span className="pv2-guide-tile-icon">
                      <GuideIcon name={r.icon} size={18} />
                    </span>
                    <span className="pv2-guide-tile-label">{r.label}</span>
                    <span className="pv2-guide-tile-desc">{inline(r.desc)}</span>
                  </div>
                ))}
              </div>
            );
          case "figure":
            return (
              <figure key={i} className="pv2-guide-figure">
                <img
                  src={b.src}
                  alt={b.alt}
                  width={b.width}
                  height={b.height}
                  loading="lazy"
                  decoding="async"
                  className="pv2-guide-figure-img"
                />
                <figcaption className="pv2-guide-figcaption">{b.caption}</figcaption>
              </figure>
            );
          case "dl":
            return (
              <dl key={i} className="pv2-guide-dl">
                {b.rows.map((row) => (
                  <div className="pv2-guide-dl-row" key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{inline(row.desc)}</dd>
                  </div>
                ))}
              </dl>
            );
          case "table":
            // 🔴 원칙 13번 — 좁은 화면에서는 표 대신 카드다. 같은 `rows` 를 돌린다.
            return (
              <Fragment key={i}>
                <div className="pv2-guide-tablewrap">
                  <table className="pv2-guide-table">
                    <thead>
                      <tr>
                        <th scope="col">{b.head[0]}</th>
                        <th scope="col">{b.head[1]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r) => (
                        <tr key={r.label}>
                          <th scope="row">{r.label}</th>
                          <td>{r.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pv2-guide-rowcards">
                  {b.rows.map((r) => (
                    <div className="pv2-guide-rowcard" key={r.label}>
                      <div className="pv2-guide-rowcard-name">{r.label}</div>
                      <div className="pv2-guide-rowcard-desc">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </Fragment>
            );
          case "faq":
            return (
              <Fragment key={i}>
                {b.rows.map((f) => (
                  <div className="pv2-guide-faq-row" key={f.q}>
                    <div className="pv2-guide-faq-q">Q. {f.q}</div>
                    <div className="pv2-guide-faq-a">{f.a}</div>
                  </div>
                ))}
              </Fragment>
            );
          case "pills":
            return <Pills key={i} set={b.set} />;
          case "mock":
            return (
              <div key={i} className="pv2-guide-mock" aria-hidden="true">
                <div className="pv2-guide-mock-bar">
                  <span className="pv2-guide-mock-dot" />
                  <span className="pv2-guide-mock-dot" />
                  <span className="pv2-guide-mock-dot" />
                </div>
                <div className="pv2-guide-mock-body">
                  <div className="pv2-guide-mock-title" />
                  <div className="pv2-guide-mock-btn">{b.buttonLabel}</div>
                </div>
              </div>
            );
          case "tel":
            return (
              <a key={i} className="pv2-guide-tel" href={`tel:${b.number}`}>
                {b.label}
              </a>
            );
        }
      })}
    </>
  );
}

function GuidePageInner() {
  const items = guideItemsFor("portal");
  const topic = useSearchParams().get("topic");

  // 🔴 알 수 없는 `topic` 에 빈 화면을 내지 않는다 — 첫 항목으로 떨어뜨린다.
  //    그때는 `open` 이 false 라 모바일에서는 **목록**이 보인다(지시서 3-2).
  const matched = items.find((i) => i.id === topic);
  const current = matched || items[0];
  const open = Boolean(matched);

  return (
    <>
      <div className="pv2-page-head pv2-page-head-tight">
        <h1 className="pv2-page-title">{GUIDE_PORTAL_TITLE}</h1>
        <p className="pv2-page-desc">{GUIDE_PORTAL_LEAD}</p>
      </div>

      <div className={open ? "pv2-guide pv2-guide-open" : "pv2-guide"}>
        <nav className="pv2-guide-toc" aria-label="이용가이드 항목">
          {items.map((it) => (
            <Link
              key={it.id}
              href={`/customer/guide?topic=${it.id}`}
              className={
                it.id === current.id ? "pv2-guide-toc-item pv2-guide-toc-item-on" : "pv2-guide-toc-item"
              }
              aria-current={it.id === current.id ? "page" : undefined}
            >
              <span className="pv2-guide-toc-icon">
                {it.icon && <GuideIcon name={it.icon} size={17} />}
              </span>
              <span className="pv2-guide-toc-text">{it.title}</span>
              <span className="pv2-guide-toc-arrow" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </nav>

        <article className="pv2-guide-body" aria-labelledby="pv2-guide-title">
          <h2 className="pv2-guide-title" id="pv2-guide-title">
            {current.icon && (
              <span className="pv2-guide-title-icon">
                <GuideIcon name={current.icon} size={20} />
              </span>
            )}
            {current.title}
          </h2>
          <Blocks blocks={current.blocks} />
        </article>
      </div>
    </>
  );
}

export default function CustomerGuidePage() {
  // `useSearchParams()` 는 Suspense 경계 안에 있어야 빌드가 통과한다(원칙 38번과 같은 결).
  return (
    <Suspense fallback={<div className="pv2-empty">불러오는 중...</div>}>
      <GuidePageInner />
    </Suspense>
  );
}

import LandingHeader from "@/components/LandingHeader";
import SiteFooter from "@/components/SiteFooter";

// 법적 문서(이용약관·개인정보처리방침) 공용 렌더러.
//
// 두 문서가 조문 구조(조 제목 → 항 → 호 → 표)를 똑같이 쓰기 때문에, 화면마다 JSX를
// 새로 짜지 않고 내용은 데이터(`lib/legal/*.ts`)로만 두고 여기서 그린다.
// 나중에 조문을 고칠 때 **이 파일이 아니라 `lib/legal/` 쪽 내용 파일만 고치면 된다.**
//
// 훅을 쓰지 않는 순수 표시용이라 `"use client"`를 붙이지 않음(서버 컴포넌트로 동작).

// 본문 안의 강조는 원문 마크다운과 같은 `**...**` 표기를 그대로 쓴다 — 내용 파일이
// 원본 .md와 거의 같은 모양으로 유지되어 대조하기 쉬움. HTML을 직접 삽입하지 않고
// (dangerouslySetInnerHTML 미사용) 문자열을 나눠 <strong>으로만 감싼다.
function renderInline(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  );
}

/** 항(1. 2. 3.) 하나. 하위 호(각 호)가 있으면 sub에 넣는다. */
export type LegalListItem = string | { text: string; sub: string[] };

export type LegalBlock =
  /** indent를 주면 한 단 들여쓴다(법령 인용의 "각 호"처럼 상위 항에 딸린 줄) */
  | { type: "p"; text: string; indent?: boolean }
  /** 항 — 번호가 붙는 목록 */
  | { type: "ol"; items: LegalListItem[] }
  /** 호 — 항이 하나뿐이라 번호 없이 나열하는 경우 */
  | { type: "ul"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  /** 안내 상자(원문의 인용 블록) */
  | { type: "note"; text: string }
  /** 조 안의 소제목(처리방침의 "관리적 조치" 등) */
  | { type: "h3"; text: string };

export type LegalArticle = {
  /** 예: "제1조 (목적)" */
  heading: string;
  blocks: LegalBlock[];
};

export type LegalSection = {
  /** 예: "제1장 총칙" — 장 구분이 없는 문서는 생략 */
  chapter?: string;
  articles: LegalArticle[];
};

function Blocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i} className={block.indent ? "legal-p legal-p-indent" : "legal-p"}>
                {renderInline(block.text)}
              </p>
            );
          case "h3":
            return (
              <h4 key={i} className="legal-h3">
                {block.text}
              </h4>
            );
          case "ol":
            return (
              <ol key={i} className="legal-ol">
                {block.items.map((item, j) => {
                  const text = typeof item === "string" ? item : item.text;
                  const sub = typeof item === "string" ? undefined : item.sub;
                  return (
                    <li key={j}>
                      {renderInline(text)}
                      {sub && (
                        <ul className="legal-ul legal-ul-nested">
                          {sub.map((s, k) => (
                            <li key={k}>{renderInline(s)}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            );
          case "ul":
            return (
              <ul key={i} className="legal-ul">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "note":
            return (
              <p key={i} className="legal-note">
                {renderInline(block.text)}
              </p>
            );
          case "table":
            return (
              // 표는 좁은 화면에서 페이지 자체를 가로로 늘리지 않고 자기 안에서만 스크롤
              <div key={i} className="table-scroll legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr>
                      {block.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

/**
 * 조문 본문(도입부 + 장/조 카드)만 그리는 부분.
 *
 * 페이지(`LegalDoc`)와 모달(`components/LegalModal.tsx`)이 **똑같은 조문을 서로 다른
 * 껍데기 안에** 보여줘야 해서 분리해 둔 것이다. 한쪽에만 손대면 두 화면의 내용이
 * 어긋나므로 **본문 표현을 바꿀 때는 반드시 여기만 고칠 것.**
 *
 * (분리 전에는 `LegalDoc` 안에 인라인으로 있었고, 출력 결과는 그때와 동일하다.)
 */
export function LegalDocBody({
  intro,
  sections,
}: {
  intro?: LegalBlock[];
  sections: LegalSection[];
}) {
  return (
    <>
      {intro && (
        <section className="card legal-card">
          <Blocks blocks={intro} />
        </section>
      )}

      {sections.map((section, i) => (
        <section key={i} className="card legal-card">
          {section.chapter && <h2 className="legal-chapter">{section.chapter}</h2>}
          {section.articles.map((article, j) => (
            <article key={j} className="legal-article">
              <h3 className="legal-heading">{article.heading}</h3>
              <Blocks blocks={article.blocks} />
            </article>
          ))}
        </section>
      ))}
    </>
  );
}

export default function LegalDoc({
  title,
  intro,
  effectiveLabel,
  sections,
}: {
  title: string;
  /** 제목 아래 도입부(조문 앞에 오는 설명 문단) */
  intro?: LegalBlock[];
  /** 예: "시행일 2026년 9월 1일" */
  effectiveLabel: string;
  sections: LegalSection[];
}) {
  return (
    <div className="portal-theme">
      <LandingHeader />

      <main className="container legal-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-desc">{effectiveLabel}</p>
          </div>
        </div>

        <LegalDocBody intro={intro} sections={sections} />
      </main>

      <SiteFooter />
    </div>
  );
}

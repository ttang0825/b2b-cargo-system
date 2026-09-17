"use client";

import { useEffect, useRef, useState } from "react";
import AnnouncementBody from "@/components/AnnouncementBody";
import {
  ANNOUNCEMENT_COLORS,
  ANNOUNCEMENT_FORMAT_MARKUP,
  ANNOUNCEMENT_MARKUP_HELP,
  ANNOUNCEMENT_SIZES,
} from "@/lib/announcementMarkup";

/** 자주 쓸 만한 것만 — 🔴 늘리면 버튼 판이 커져서 오히려 못 고른다. */
const EMOJIS = [
  "📢", "🚚", "📦", "⚠️", "✅", "❗",
  "📞", "🕒", "📅", "🎉", "🙏", "👉",
];

type Menu = "size" | "color" | "emoji" | null;

/**
 * 공지 본문 편집기 — 🔴 **간이 서식**이다(사용자 확정 2026-09-17).
 *
 * 🔴 정식 편집기(Tiptap 등) 라이브러리를 들이지 않았다 — 그 경우 HTML 정화까지
 *    한 벌로 따라와서 작업이 통째로 커진다. 대신 `[b]`·`[color=red]` 같은 표기를
 *    버튼이 넣어 주고, 그리는 쪽에서 `lib/announcementMarkup.ts` 가 허락한 것만
 *    서식으로 바꾼다. 🔴 **「편집기 라이브러리로 갈아타자」로 되돌리기 전에
 *    `lib/announcementMarkup.ts` 머리말의 안전 구조 설명을 읽을 것.**
 *
 * 🔴 담당자가 표기를 외울 필요가 없다 — 글자를 고르고 버튼만 누른다.
 */
export default function AnnouncementEditor({
  value,
  onChange,
  title,
}: {
  value: string;
  onChange: (next: string) => void;
  title?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [menu, setMenu] = useState<Menu>(null);
  const [narrow, setNarrow] = useState(false);

  // 바깥을 누르면 드롭다운이 닫힌다 — 원칙 20번(이 저장소의 기존 패턴).
  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  /**
   * 고른 글자를 표기로 감싼다.
   * 🔴 고른 것이 없으면 **예시 글자를 넣어 준다** — 빈 `[b][/b]` 만 들어가면
   *    담당자가 커서를 어디에 둬야 할지 모른다.
   * 🔴 감싼 뒤 그 글자를 **다시 선택 상태로 만든다** — 바로 이어서 다른 서식을
   *    겹쳐 걸 수 있다(굵게 + 빨강).
   */
  function wrap(open: string, close: string, placeholder: string) {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const picked = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + open + picked + close + value.slice(end);
    onChange(next);
    const from = start + open.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, from + picked.length);
    });
    setMenu(null);
  }

  /**
   * 커서 자리에 그대로 끼워 넣는다(이모지·목록·구분선).
   * 🔴 **고른 글자를 지우지 않는다** — 선택 **끝**에 끼운다. 위 `wrap()` 이 서식을
   *    건 뒤 그 글자를 다시 선택 상태로 두기 때문에, 선택을 지우는 방식이면
   *    「굵게 → 이모지」를 이어서 누를 때 방금 굵게 한 글자가 이모지로 바뀐다
   *    (렌더링 확인에서 실제로 그랬다).
   */
  function insert(text: string) {
    const el = areaRef.current;
    if (!el) return;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, end) + text + value.slice(end);
    onChange(next);
    const to = end + text.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(to, to);
    });
    setMenu(null);
  }

  return (
    <div className="ann-editor">
      <div className="ann-editor-tabs">
        {/* 🔴 `type="button"` 을 빼지 말 것 — 폼 안이라 기본값이 submit 이고,
            버튼을 누를 때마다 공지가 등록된다. */}
        <button
          type="button"
          className={`ann-editor-tab${tab === "edit" ? " is-on" : ""}`}
          onClick={() => setTab("edit")}
        >
          편집
        </button>
        <button
          type="button"
          className={`ann-editor-tab${tab === "preview" ? " is-on" : ""}`}
          onClick={() => setTab("preview")}
        >
          미리보기
        </button>
      </div>

      {tab === "edit" ? (
        <>
          <div className="ann-editor-bar" ref={barRef}>
            <button type="button" className="ann-editor-btn" style={{ fontWeight: 800 }}
              onClick={() => wrap("[b]", "[/b]", "굵게")} title="굵게">
              가
            </button>
            <button type="button" className="ann-editor-btn" style={{ textDecoration: "underline" }}
              onClick={() => wrap("[u]", "[/u]", "밑줄")} title="밑줄">
              가
            </button>

            <span className="ann-editor-sep" />

            <span className="ann-editor-pop">
              <button type="button" className="ann-editor-btn"
                onClick={() => setMenu(menu === "size" ? null : "size")}>
                글자 크기 ▾
              </button>
              {menu === "size" && (
                <span className="ann-editor-menu">
                  {ANNOUNCEMENT_SIZES.map((s) => (
                    <button key={s.key} type="button"
                      onClick={() => wrap(`[size=${s.key}]`, "[/size]", s.label)}>
                      {s.label}
                    </button>
                  ))}
                </span>
              )}
            </span>

            <span className="ann-editor-pop">
              <button type="button" className="ann-editor-btn"
                onClick={() => setMenu(menu === "color" ? null : "color")}>
                글자 색 ▾
              </button>
              {menu === "color" && (
                <span className="ann-editor-menu">
                  {ANNOUNCEMENT_COLORS.map((c) => (
                    <button key={c.key} type="button"
                      onClick={() => wrap(`[color=${c.key}]`, "[/color]", c.label)}>
                      <span className={`ann-body ann-color-${c.key}`} style={{ display: "inline" }}>
                        ● {c.label}
                      </span>
                    </button>
                  ))}
                </span>
              )}
            </span>

            <span className="ann-editor-pop">
              <button type="button" className="ann-editor-btn"
                onClick={() => setMenu(menu === "emoji" ? null : "emoji")}>
                이모지 ▾
              </button>
              {menu === "emoji" && (
                <span className="ann-editor-menu is-emoji">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => insert(e)}>
                      {e}
                    </button>
                  ))}
                </span>
              )}
            </span>

            <span className="ann-editor-sep" />

            <button type="button" className="ann-editor-btn"
              onClick={() => wrap("[link=https://", "]링크 글자[/link]", "")} title="링크">
              링크
            </button>
            <button type="button" className="ann-editor-btn"
              onClick={() => insert("\n- ")} title="목록">
              목록
            </button>
            <button type="button" className="ann-editor-btn"
              onClick={() => insert("\n---\n")} title="구분선">
              구분선
            </button>
          </div>

          {/* 🔴 `onKeyDown` 에 Enter 막기를 걸지 말 것 — 여기는 줄바꿈이 필요한
              칸이다(원칙 34번도 textarea 는 예외로 둔다). */}
          <textarea
            ref={areaRef}
            className="ann-editor-area"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="공지 내용을 입력하세요. 글자를 선택하고 위 버튼을 누르면 서식이 붙습니다."
          />
          <p className="ann-editor-help">{ANNOUNCEMENT_MARKUP_HELP}</p>
        </>
      ) : (
        <>
          <div className="ann-preview-head">
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              화주 화면에 이렇게 보입니다
            </span>
            <button type="button" className="ann-editor-btn" onClick={() => setNarrow((v) => !v)}>
              {narrow ? "넓게 보기" : "폭 좁게 보기"}
            </button>
          </div>
          <div className={`ann-preview${narrow ? " is-narrow" : ""}`}>
            {title?.trim() && <p className="ann-preview-title">{title}</p>}
            {value.trim() ? (
              // 🔴 화주가 보는 것과 **같은 부품**이다 — 미리보기 전용 렌더러를
              //    따로 만들지 말 것.
              <AnnouncementBody content={value} format={ANNOUNCEMENT_FORMAT_MARKUP} />
            ) : (
              <span className="ann-preview-empty">내용이 없습니다.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

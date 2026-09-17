// 공지사항 간이 서식 — 굵게 · 밑줄 · 글자 크기 · 글자 색 · 링크 · 목록 · 구분선
//
// 🔴 **이 파일이 유일한 정의처다.** 관리자 미리보기와 화주 화면이 같은 함수를 쓴다 —
//    따로 만들면 미리보기가 거짓말이 된다("올리니까 달라졌다").
//
// 🔴 **왜 편집기 라이브러리를 안 썼는가**(사용자 확정 2026-09-17) — 지시서 원안은
//    정식 편집기(Tiptap) + HTML 정화(sanitize-html) 둘을 들이는 것이었는데, 사용자가
//    작업량을 보고 *"최소한의 수정으로 글자볼드, 글자크기, 글자컬러, 이모티콘"* 으로
//    범위를 줄였다. 🔴 **그래서 이 저장소의 「신규 의존성 0」이 그대로 지켜졌다.**
//
// 🔴 **안전 구조가 정식 편집기와 반대다 — 이 점을 잊지 말 것.**
//      정식 편집기: 담당자가 쓴 HTML 을 **받아서** 위험한 것을 골라낸다(골라내기를
//                   한 군데 빠뜨리면 구멍이 된다)
//      이 방식    : 본문을 **전부 이스케이프한 뒤** 우리가 허락한 표기만 태그로
//                   **만들어 낸다**(통과시키는 HTML 이 애초에 없다)
//    그래서 담당자가 `<script>` 를 적어도 **그냥 글자로 보인다.**
//    🔴 **이스케이프를 나중으로 미루거나 건너뛰지 말 것 — 그 한 줄이 이 구조의 전부다.**
//    🔴 **원본 HTML 을 통과시키는 표기(`[html]` 같은 것)를 만들지 말 것.**
//
// 이모지는 아무 표기도 필요 없다 — 유니코드 글자라 그대로 저장되고 그대로 보인다.

/** 본문을 어떤 방식으로 읽을지. 🔴 값을 늘리면 DB CHECK 제약도 같이 갱신할 것
 *  (`migrations/2026-09-17_announcement_markup.sql` ②) — 안 하면 저장이 통째로 막힌다. */
export type AnnouncementFormat = "plain" | "markup";

export const ANNOUNCEMENT_FORMAT_PLAIN: AnnouncementFormat = "plain";
export const ANNOUNCEMENT_FORMAT_MARKUP: AnnouncementFormat = "markup";

/** 🔴 새로 저장하는 본문은 전부 이 방식이다. 기존 행은 `plain` 으로 남는다
 *  (그 본문에는 줄바꿈이 들어 있고, 서식으로 읽으면 통째로 사라진다 — `_verify.sql` ㉙-f). */
export const ANNOUNCEMENT_FORMAT_DEFAULT: AnnouncementFormat = ANNOUNCEMENT_FORMAT_MARKUP;

/** 글자 크기 — 🔴 `em` 이라 관리자(작은 본문)와 화주 화면(큰 본문) 어디에 놓아도
 *  주변 글자와의 **비율**이 같다. px 로 바꾸면 미리보기와 실제가 어긋난다. */
export const ANNOUNCEMENT_SIZES = [
  { key: "lg", label: "크게" },
  { key: "xl", label: "아주 크게" },
] as const;

/** 글자 색 — 🔴 **정해진 목록에서만 고른다.** 임의의 색(`#a1b2c3`)을 받으면
 *  그 값이 그대로 CSS 에 들어가는 길이 열리고, 대비가 떨어지는 색이 섞여
 *  화주 화면에서 안 읽히는 공지가 나온다. */
export const ANNOUNCEMENT_COLORS = [
  { key: "red", label: "빨강" },
  { key: "blue", label: "파랑" },
  { key: "green", label: "초록" },
  { key: "orange", label: "주황" },
  { key: "gray", label: "회색" },
] as const;

const SIZE_KEYS = new Set<string>(ANNOUNCEMENT_SIZES.map((s) => s.key));
const COLOR_KEYS = new Set<string>(ANNOUNCEMENT_COLORS.map((c) => c.key));

/** 여는 태그가 겹칠 수 있는 깊이 상한. 담당자가 실수로 태그를 잔뜩 열어도
 *  출력이 끝없이 늘어나지 않게 한다. */
const MAX_OPEN_DEPTH = 20;

/** 🔴 HTML 로 해석될 수 있는 글자를 **먼저 전부** 죽인다. 이 함수가 안전의 전부다. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 링크 주소 검사.
 * 🔴 `http`/`https` 로 시작하는 것만 통과시킨다 — `javascript:` 를 막는 자리다.
 * ⚠️ 이 함수가 받는 문자열은 **이미 이스케이프된 것**이라 `&` 는 `&amp;` 로,
 *    따옴표는 `&quot;`·`&#39;` 로 들어 있다. 그 상태 그대로 `href` 에 넣는 것이
 *    맞다(HTML 속성 안에서는 그게 정상 표기다). 🔴 되돌리지 말 것 —
 *    되돌리면 따옴표로 속성을 빠져나가는 길이 열린다.
 */
function safeHref(escapedUrl: string): string | null {
  if (!/^https?:\/\//i.test(escapedUrl)) return null;
  if (!/^[A-Za-z0-9\-._~:/?#@!$&+,;=%]+$/.test(escapedUrl)) return null;
  if (escapedUrl.length > 500) return null;
  return escapedUrl;
}

type OpenTag = { name: string; close: string };

/** 태그 하나를 여는 HTML 을 만든다. 값이 허용 목록 밖이면 `null`(= 글자로 남긴다). */
function openTagHtml(name: string, value: string | undefined): OpenTag | null {
  switch (name) {
    case "b":
      return { name, close: "</strong>" };
    case "u":
      return { name, close: "</u>" };
    case "size":
      if (!value || !SIZE_KEYS.has(value)) return null;
      return { name, close: "</span>" };
    case "color":
      if (!value || !COLOR_KEYS.has(value)) return null;
      return { name, close: "</span>" };
    case "link": {
      if (!value) return null;
      const href = safeHref(value);
      if (!href) return null;
      return { name, close: "</a>" };
    }
    default:
      return null;
  }
}

function openTagMarkup(name: string, value: string | undefined): string {
  switch (name) {
    case "b":
      return "<strong>";
    case "u":
      return "<u>";
    case "size":
      return `<span class="ann-size-${value}">`;
    case "color":
      return `<span class="ann-color-${value}">`;
    case "link":
      // 🔴 `rel="noopener noreferrer"` 를 빼지 말 것 — 새 창으로 연 페이지가
      //    우리 화면을 조작할 수 있게 된다.
      return `<a href="${value}" target="_blank" rel="noopener noreferrer">`;
    default:
      return "";
  }
}

const TAG_RE = /\[(\/?)(b|u|size|color|link)(?:=([^\]\s]+))?\]/g;

/**
 * 한 덩어리(문단/목록 항목) 안의 표기를 HTML 로 바꾼다.
 * 🔴 입력은 **이미 이스케이프된 문자열**이어야 한다.
 * 🔴 짝이 안 맞는 태그는 **글자 그대로 보여준다** — 조용히 먹어 버리면 담당자가
 *    "왜 안 나오지" 하고 원인을 못 찾는다(원칙 55번과 같은 결).
 */
function renderInline(escaped: string): string {
  let out = "";
  let last = 0;
  const stack: OpenTag[] = [];
  TAG_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(escaped)) !== null) {
    out += escaped.slice(last, m.index);
    last = m.index + m[0].length;

    const isClose = m[1] === "/";
    const name = m[2];
    const value = m[3];

    if (isClose) {
      if (value) {
        // `[/color=red]` 같은 건 우리 표기가 아니다 — 글자로 남긴다.
        out += m[0];
        continue;
      }
      const top = stack[stack.length - 1];
      if (top && top.name === name) {
        stack.pop();
        out += top.close;
      } else {
        out += m[0];
      }
      continue;
    }

    if (stack.length >= MAX_OPEN_DEPTH) {
      out += m[0];
      continue;
    }
    const opened = openTagHtml(name, value);
    if (!opened) {
      out += m[0];
      continue;
    }
    stack.push(opened);
    out += openTagMarkup(name, value);
  }

  out += escaped.slice(last);

  // 덩어리가 끝날 때까지 안 닫힌 태그는 여기서 닫는다 — 열린 채로 두면
  // 뒤따르는 문단까지 서식이 번진다.
  while (stack.length > 0) out += stack.pop()!.close;

  return out;
}

const HR_RE = /^\s*-{3,}\s*$/;
const LIST_RE = /^\s*[-*]\s+(.*)$/;

/**
 * 공지 본문(간이 서식)을 HTML 로 만든다.
 * 🔴 이 함수가 만든 문자열만 `dangerouslySetInnerHTML` 에 넣는다 —
 *    `components/AnnouncementBody.tsx` 밖에서 그 속성을 쓰지 말 것.
 */
export function renderAnnouncementMarkup(content: string | null | undefined): string {
  if (!content) return "";
  const lines = escapeHtml(content).replace(/\r\n?/g, "\n").split("\n");

  const blocks: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    // 🔴 같은 문단 안의 줄바꿈은 `<br />` 로 살린다 — 안 살리면 평문으로 적던
    //    공지가 한 줄로 뭉개진다(기존 행이 실제로 그렇다).
    blocks.push(`<p>${para.map(renderInline).join("<br />")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(`<ul>${list.map((li) => `<li>${renderInline(li)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    if (HR_RE.test(line)) {
      flushPara();
      flushList();
      blocks.push("<hr />");
      continue;
    }
    const li = line.match(LIST_RE);
    if (li) {
      flushPara();
      list.push(li[1]);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();

  return blocks.join("");
}

/** 본문이 비었는가 — 🔴 공백만 있는 본문은 `null` 로 저장해야 화주 화면의
 *  "내용 없음" 처리가 걸린다. */
export function isBlankAnnouncementContent(content: string | null | undefined): boolean {
  return !content || content.trim() === "";
}

/** 담당자에게 보여줄 표기 도움말 — 🔴 화면에 문자열을 다시 적지 말 것. */
export const ANNOUNCEMENT_MARKUP_HELP =
  "글자를 선택하고 위 버튼을 누르면 서식이 붙습니다. " +
  "줄 앞에 «- »를 적으면 목록, «---»만 있는 줄은 구분선이 됩니다. 이모지는 그대로 붙여넣으면 됩니다.";

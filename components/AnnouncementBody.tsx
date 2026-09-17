"use client";

import {
  ANNOUNCEMENT_FORMAT_MARKUP,
  renderAnnouncementMarkup,
  type AnnouncementFormat,
} from "@/lib/announcementMarkup";

/**
 * 공지 본문을 그리는 **유일한 부품**.
 *
 * 🔴 관리자 미리보기와 화주 화면이 **이것을 같이 쓴다** — 미리보기 전용 렌더러를
 *    따로 만들지 말 것. 그 순간 미리보기가 거짓말이 된다("올리니까 달라졌다").
 *
 * 🔴 `dangerouslySetInnerHTML` 은 **이 파일에서만** 쓴다. 넣는 값은 반드시
 *    `renderAnnouncementMarkup()` 이 만든 것이어야 한다 — 그 함수는 본문을 전부
 *    이스케이프한 뒤 허락한 표기만 태그로 만들어 내므로, DB 에 무엇이 들어 있든
 *    실행되는 HTML 이 나오지 않는다(`lib/announcementMarkup.ts` 머리말).
 *    🔴 **DB 값을 그대로 넣는 경로를 만들지 말 것.**
 *
 * 🔴 `format` 이 `plain` 인 옛 공지는 **평문 그대로** 그린다 — 그 본문에는 줄바꿈이
 *    들어 있고(`_verify.sql` ㉙-f), 서식으로 읽으면 통째로 사라진다.
 *    **옛 행까지 markup 으로 읽도록 바꾸지 말 것.**
 */
export default function AnnouncementBody({
  content,
  format,
  className,
}: {
  content: string | null | undefined;
  format: AnnouncementFormat | string | null | undefined;
  className?: string;
}) {
  if (!content) return null;

  const cls = `ann-body${className ? " " + className : ""}`;

  if (format !== ANNOUNCEMENT_FORMAT_MARKUP) {
    // 옛 공지 — 평문. `white-space: pre-wrap` 은 CSS 쪽 `.ann-body-plain` 에 있다.
    return <div className={`${cls} ann-body-plain`}>{content}</div>;
  }

  return (
    <div className={cls} dangerouslySetInnerHTML={{ __html: renderAnnouncementMarkup(content) }} />
  );
}

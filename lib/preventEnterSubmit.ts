import type { KeyboardEvent } from "react";

// 입력 중 습관적으로 누르는 Enter키가 폼을 그대로 제출(저장/등록)시켜버리는 것을
// 막기 위한 공용 핸들러. <form onSubmit={...}>에 onKeyDown={handleFormKeyDown}만
// 추가하면 됨 — 저장/등록은 오직 버튼 클릭으로만 실행되도록 강제한다.
// <textarea>는 Enter가 줄바꿈 용도라 예외로 둔다.
export function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
  const target = e.target as HTMLElement;
  if (e.key === "Enter" && target.tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}

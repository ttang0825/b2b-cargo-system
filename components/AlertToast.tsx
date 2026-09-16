"use client";

import Link from "next/link";

/**
 * 새 소식이 도착한 순간 화면 **오른쪽 아래**에 뜨는 배너 (38차 A장).
 *
 * 🔴 **관리자와 화주포털이 같이 쓴다**(2026-09-16에 포털이 붙었다) — 그래서
 *    **라벨을 만들지 않고 받는다.** 관리자는 「새 발주요청 2건」, 포털은
 *    「견적 업데이트 1건」이라 말이 다르다. 🔴 **여기서 `새 {label}` 처럼 조립하지
 *    말 것** — 조립하는 순간 한쪽 말이 반대편에 새어 들어간다(라벨 정의처는
 *    `lib/adminIntakeAlert.ts` · `lib/portalAlert.ts` 각각이다).
 *
 * 🔴 **공유 클래스(`.container`·`.card`·`.field`)를 쓰지 않는다** — 관리자 31화면이
 *    같이 쓰는 것이라 여기서 건드리면 그 화면들이 통째로 딸려온다(34차 `.admin-wide` ·
 *    43차 `.quote-form` 과 같은 결). 전용 접두사 `.aintake-` 를 쓴다.
 *    🔴 **`.pv2-*` 로 갈아끼우지 말 것** — 그 토큰은 `.portal-v2` 스코프 안에만 있어서
 *    관리자에서는 통째로 안 걸린다(PR #145 에서 실측). 이 배너는 양쪽에 다 떠야 한다.
 *
 * 🔴 **누르면 그 화면으로 가고 배너가 사라진다.** 닫기 단추는 따로 둔다 — 지금 볼 수
 *    없을 때 치울 길이 있어야 한다.
 *
 * 🔴 **`next/link` 다**(원칙 31번) — `<a href>` 로 바꾸면 화면이 하드 리로드된다.
 */
export type AlertToastItem = {
  id: number;
  /** 「새 발주요청」·「견적 업데이트」 — 🔴 건수는 붙이지 않는다(아래에서 붙인다) */
  title: string;
  href: string;
  count: number;
};

export default function AlertToast({
  items,
  onDismiss,
}: {
  items: AlertToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    // 🔴 `aria-live="polite"` — 화면을 못 보는 사람에게도 읽힌다. `assertive` 로
    //    올리지 말 것(하던 일을 끊는다).
    <div className="aintake-wrap" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="aintake-toast">
          <Link href={item.href} className="aintake-body" onClick={() => onDismiss(item.id)}>
            <span className="aintake-dot" aria-hidden="true" />
            <span className="aintake-text">
              <strong className="aintake-title">
                {item.title} {item.count}건
              </strong>
              <span className="aintake-sub">눌러서 확인</span>
            </span>
          </Link>
          <button
            type="button"
            className="aintake-close"
            onClick={() => onDismiss(item.id)}
            aria-label="알림 닫기"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

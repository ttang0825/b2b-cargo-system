"use client";

import Link from "next/link";
import { INTAKE_ALERTS, type IntakeKind } from "@/lib/adminIntakeAlert";

export type IntakeToastItem = { id: number; kind: IntakeKind; count: number };

/**
 * 새 접수가 들어온 순간 화면 **오른쪽 아래**에 뜨는 배너 (38차 A장).
 *
 * 🔴 **공유 클래스(`.container`·`.card`·`.field`)를 쓰지 않는다** — 관리자 31화면이
 *    같이 쓰는 것이라 여기서 건드리면 그 화면들이 통째로 딸려온다(34차 `.admin-wide` ·
 *    43차 `.quote-form` 과 같은 결). 전용 접두사 `.aintake-` 를 쓴다.
 *
 * 🔴 **누르면 그 화면으로 가고 배너가 사라진다.** 닫기 단추는 따로 둔다 — 지금 볼 수
 *    없을 때 치울 길이 있어야 한다.
 *
 * 🔴 **`next/link` 다**(원칙 31번) — `<a href>` 로 바꾸면 관리자 화면이 하드 리로드된다.
 */
export default function AdminIntakeToast({
  items,
  onDismiss,
}: {
  items: IntakeToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    // 🔴 `aria-live="polite"` — 화면을 못 보는 사람에게도 읽힌다. `assertive` 로
    //    올리지 말 것(하던 일을 끊는다).
    <div className="aintake-wrap" role="status" aria-live="polite">
      {items.map((item) => {
        const meta = INTAKE_ALERTS[item.kind];
        return (
          <div key={item.id} className="aintake-toast">
            <Link
              href={meta.href}
              className="aintake-body"
              onClick={() => onDismiss(item.id)}
            >
              <span className="aintake-dot" aria-hidden="true" />
              <span className="aintake-text">
                <strong className="aintake-title">
                  새 {meta.label} {item.count}건
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
        );
      })}
    </div>
  );
}

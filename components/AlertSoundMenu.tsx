"use client";

import { useEffect, useRef, useState } from "react";
import {
  ALERT_TONES,
  ALERT_VOLUMES,
  getAlertTone,
  getAlertVolume,
  isAlertSoundOn,
  playAlertChime,
  setAlertSoundOn,
  setAlertTone,
  setAlertVolume,
  type AlertTone,
  type AlertVolume,
} from "@/lib/alertCore";

/**
 * 알림음 — 켜고 끄기 + **볼륨 3단계 · 소리 3종** (38차 A장 후속).
 *
 * 🔴 **사용자 요청에서 시작했다**(PR #160 코멘트 2026-09-16 — *「알림 소리의 스타일과
 *    볼륨을 조절할 수 있나?」*). 조절되는 것은 **화면 안 알림음뿐이다** —
 *    🔴 **웹 푸시(B장)로 뜨는 윈도우·폰 알림의 소리는 OS 가 정하므로 우리가 못 바꾼다**
 *    (Windows 설정 → 시스템 → 알림 → 브라우저). 「푸시 소리도 여기서 고르게 하자」로
 *    넓히지 말 것 — 만들 수 없는 것을 있는 것처럼 그리게 된다.
 *
 * 🔴 **수신 설정 화면을 새로 만들지 않는다**(38차 0-3 확정: 직원 전원 같은 알림).
 *    이것은 「누가 받을지」가 아니라 **그 자리에서 얼마나 크게 들릴지**라 성격이 다르다.
 *
 * 🔴 **관리자와 화주포털이 같이 쓴다**(2026-09-16에 포털이 붙었다) — 저장 칸도 한 벌이라
 *    브라우저마다 한 번만 고르면 된다. 🔴 **포털용 사본을 따로 만들지 말 것.**
 *    ⚠️ 포털 사이드바는 화면 **왼쪽 아래**라 창이 아래로 열리면 화면 밖으로 나간다 —
 *    그래서 `placement="up-left"` 가 있다(CSS 한 규칙뿐이고 새 컴포넌트가 아니다).
 *
 * 🔴 **고르면 그 자리에서 들려준다.** 들어보지 않고는 고를 수가 없고, 무엇보다
 *    그 클릭이 곧 사용자 제스처라 **자동재생 정책이 그때 풀린다**(안 그러면 첫 접수가
 *    올 때까지 소리가 나는지 알 수 없다).
 */
export default function AlertSoundMenu({
  variant = "desktop",
  placement = "down-right",
}: {
  variant?: "desktop" | "mobile";
  /** 🔴 창이 열리는 쪽. 관리자 상단바는 아래로, 포털 사이드바 아래는 위로 연다. */
  placement?: "down-right" | "up-left";
}) {
  const [on, setOn] = useState(true);
  const [volume, setVolume] = useState<AlertVolume>("mid");
  const [tone, setTone] = useState<AlertTone>("chime");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 🔴 세 값 모두 **브라우저에만** 있는 값이라 첫 그림 뒤에 읽는다 — 서버가 그린
  //    HTML 과 달라지면 하이드레이션이 깨진다(A장이 `soundOn` 에서 같은 이유로 그랬다).
  useEffect(() => {
    setOn(isAlertSoundOn());
    setVolume(getAlertVolume());
    setTone(getAlertTone());
  }, []);

  // 바깥 빈 곳을 누르면 닫힌다(원칙 20번). Esc 도 같이 받는다.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  /** 🔴 **끄면 소리만 멈춘다** — 배지도 배너도 그대로다(38차 확정). */
  function toggle() {
    const next = !on;
    setOn(next);
    setAlertSoundOn(next);
    if (next) void playAlertChime();
  }

  function pickVolume(v: AlertVolume) {
    setVolume(v);
    setAlertVolume(v);
    // 🔴 **방금 고른 값을 인자로 넘긴다** — 저장을 읽게 두면 `localStorage` 가 막힌
    //    브라우저에서 옛 소리가 난다(그러면 「눌러도 안 바뀐다」로 보인다).
    void playAlertChime({ volume: v, tone });
  }

  function pickTone(t: AlertTone) {
    setTone(t);
    setAlertTone(t);
    void playAlertChime({ volume, tone: t });
  }

  const toggleLabel = on ? "새 접수 알림음 끄기" : "새 접수 알림음 켜기";

  const rows = (
    <>
      <div className="aintake-sound-row">
        <span className="aintake-sound-label">볼륨</span>
        <div className="aintake-seg">
          {ALERT_VOLUMES.map((v) => (
            <button
              key={v.value}
              type="button"
              className="aintake-seg-btn"
              aria-pressed={volume === v.value}
              onClick={() => pickVolume(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="aintake-sound-row">
        <span className="aintake-sound-label">소리</span>
        <div className="aintake-seg">
          {ALERT_TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              className="aintake-seg-btn"
              aria-pressed={tone === t.value}
              onClick={() => pickTone(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* 🔴 이 두 줄을 지우지 말 것 — 「눌렀는데 소리가 안 난다」와 「윈도우 알림음이
          왜 안 바뀌냐」는 문의가 각각 여기서 막힌다. */}
      <p className="aintake-sound-note">
        고르면 바로 들려드립니다. 브라우저마다 따로 기억합니다.
      </p>
      <p className="aintake-sound-note">
        휴대폰·윈도우 알림 소리는 기기 설정에서 바꿉니다.
      </p>
    </>
  );

  if (variant === "mobile") {
    // 🔴 휴대폰에서는 **펼침 창을 쓰지 않는다** — 이미 펼쳐진 메뉴 안이라 창이 창 위에
    //    겹친다. 그냥 줄로 늘어놓는다.
    return (
      <div className="aintake-sound-mobile">
        <button type="button" className="aintake-sound-mobile-toggle" onClick={toggle} aria-pressed={on}>
          {on ? "🔔 새 접수 알림음 켜짐" : "🔕 새 접수 알림음 꺼짐"}
        </button>
        {rows}
      </div>
    );
  }

  return (
    <div className="aintake-sound" ref={rootRef}>
      {/* 🔴 종 모양 하나로 끄고 켠다 — 수신 설정 화면을 새로 만들지 말 것. */}
      <button
        type="button"
        onClick={toggle}
        className="aintake-bell"
        aria-label={toggleLabel}
        aria-pressed={on}
        title={toggleLabel}
      >
        {on ? "🔔" : "🔕"}
      </button>
      {/* 🔴 끄고 켜기와 **다른 단추**다 — 하나로 합치면 소리를 끄려다 창이 열린다. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="aintake-sound-more"
        aria-label="알림음 설정"
        aria-expanded={open}
        title="알림음 설정 (볼륨 · 소리)"
      >
        ▾
      </button>
      {open && (
        <div
          className={
            placement === "up-left" ? "aintake-sound-panel aintake-sound-panel-up" : "aintake-sound-panel"
          }
          role="group"
          aria-label="알림음 설정"
        >
          {rows}
        </div>
      )}
    </div>
  );
}

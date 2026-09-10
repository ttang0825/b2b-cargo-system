"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

// 모바일에서만 **떠 있고 끌어 옮길 수 있는** 패널 (34차 실사용 리뷰 3라운드).
//
// 사용자 지시: *"모바일에서 「자동계산결과」창은 팝업으로 기본 아래에 배치되는데 끌어다
// 자유롭게 위치조정을 할수 있게"*
//
// 🔴 **데스크탑은 한 겹도 안 씌운다** — `isMobile` 이 아니면 `children` 을 그대로
//    돌려준다. 견적 화면의 계산 패널은 데스크탑에서 `position: sticky` 로 따라다니는데,
//    감싸개를 하나라도 끼우면 그 sticky 의 기준(가장 가까운 스크롤 조상)이 바뀌어
//    **따라다니기가 조용히 멈춘다.**
// 🔴 **`touch-action: none` 을 손잡이에서 빼지 말 것** — 없으면 손가락으로 끄는 동안
//    브라우저가 페이지 스크롤로 가로채서 패널이 안 따라온다.
// 🔴 **화면 밖으로 완전히 나가지 않게 clamp 한다** — 한 번 나가면 되돌릴 방법이 없다.
//    손잡이가 항상 화면 안에 남도록 아래·오른쪽을 여유 있게 잡는다.
// ⚠️ 위치는 **기억하지 않는다**(state 뿐). 저장하려면 어디에 저장할지부터 정해야 하고,
//    화면 크기가 달라지면 그 좌표가 화면 밖일 수 있다 — 이번 범위 밖으로 뒀다.

const MOBILE_QUERY = "(max-width: 700px)";
/**
 * 화면 가장자리에서 이만큼(px)은 항상 보이게 남긴다.
 * 🔴 **손잡이를 다시 잡을 수 있을 만큼**이어야 한다 — 40px 로 뒀더니 옆으로 끌었을 때
 *    모서리 한 조각만 남아 다시 끌어오기가 어려웠다(실측). 값을 더 줄이지 말 것.
 */
const EDGE_KEEP = 72;

export default function DraggablePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // 🔴 서버 렌더에서는 `window` 가 없으므로 항상 데스크탑으로 시작한다 —
  //    그래야 첫 페인트가 깜빡이지 않는다.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // 모바일로 들어온 첫 순간에만 기본 자리(화면 아래)를 잡는다.
  // 🔴 사용자가 한 번 옮긴 뒤에는 다시 잡지 않는다(`pos` 가 있으면 건너뛴다).
  useEffect(() => {
    if (!isMobile || pos) return;
    const h = boxRef.current?.offsetHeight || 180;
    setPos({
      left: 8,
      top: Math.max(8, window.innerHeight - h - 16),
    });
  }, [isMobile, pos]);

  const clamp = useCallback((left: number, top: number) => {
    const w = boxRef.current?.offsetWidth || 300;
    const h = boxRef.current?.offsetHeight || 180;
    return {
      left: Math.min(Math.max(left, EDGE_KEEP - w), window.innerWidth - EDGE_KEEP),
      top: Math.min(Math.max(top, 0), window.innerHeight - EDGE_KEEP),
    };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isMobile || !pos) return;
    // 🔴 포인터를 손잡이에 묶어 둔다 — 안 하면 손가락이 손잡이를 벗어나는 순간
    //    move 이벤트가 끊겨 패널이 그 자리에 멈춘다.
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.left, dy: e.clientY - pos.top };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    setPos(clamp(e.clientX - d.dx, e.clientY - d.dy));
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }

  if (!isMobile) return <>{children}</>;

  return (
    <div
      ref={boxRef}
      className="drag-panel"
      style={pos ? { left: pos.left, top: pos.top } : { left: 8, bottom: 16 }}
    >
      <div
        className="drag-panel-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={`${title} 창 위치 옮기기`}
      >
        <span className="drag-panel-grip" aria-hidden="true" />
        <span className="drag-panel-title">{title}</span>
        <span className="drag-panel-hint">끌어서 이동</span>
      </div>
      <div className="drag-panel-body">{children}</div>
    </div>
  );
}

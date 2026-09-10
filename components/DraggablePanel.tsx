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
// 🔴 **위아래로만 움직인다**(리뷰 4라운드 — *"계산창을 좌우로는 안움직였으면 좋겠다"*).
//    좌우를 막아 두면 손가락이 비스듬히 미끄러져도 창이 옆으로 새지 않고, 화면 양쪽
//    가장자리로 반쯤 빠져나가 다시 잡기 어려워지는 일도 아예 없어진다.
//    🔴 가로는 **CSS 가 가운데로 잡는다**(리뷰 5라운드) — 드래그도 JS 도 안 건드린다.
// ⚠️ 위치는 **기억하지 않는다**(state 뿐). 저장하려면 어디에 저장할지부터 정해야 하고,
//    화면 크기가 달라지면 그 좌표가 화면 밖일 수 있다 — 이번 범위 밖으로 뒀다.

const MOBILE_QUERY = "(max-width: 700px)";
/**
 * 화면 **아래** 가장자리에서 이만큼(px)은 항상 보이게 남긴다.
 * 🔴 손잡이를 다시 잡을 수 있을 만큼이어야 한다. 값을 더 줄이지 말 것.
 * ⚠️ 좌우는 리뷰 4라운드에 아예 막았으므로 가로 clamp 는 필요 없어졌다.
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
  /**
   * 세로 위치만 들고 있는다.
   * 🔴 **가로는 JS 가 정하지 않는다**(리뷰 5라운드 — *"약간 왼쪽으로 쏠려 있다.
   *    가운데 정렬이 되어야 한다"*). `left: 8px` 로 잡고 있었는데 패널 폭에 상한
   *    (360px)이 있어서 화면이 그보다 넓으면 **왼쪽 8px / 오른쪽 22px** 로 어긋났다.
   *    이제 CSS 가 `left: 50%` + `translateX(-50%)` 로 가운데를 잡는다 — 화면을 돌리거나
   *    크기가 바뀌어도 **저절로 다시 가운데**가 된다(JS 로 계산하면 그때 다시 어긋난다).
   * 🔴 그래서 여기에 `left` 를 되살리지 말 것.
   */
  const [top, setTop] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dy: number } | null>(null);

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
    if (!isMobile || top !== null) return;
    const h = boxRef.current?.offsetHeight || 180;
    setTop(Math.max(8, window.innerHeight - h - 16));
  }, [isMobile, top]);

  /** 🔴 세로만 잡는다 — 가로는 아예 계산하지 않는다(리뷰 4라운드). */
  const clampTop = useCallback(
    (top: number) => Math.min(Math.max(top, 0), window.innerHeight - EDGE_KEEP),
    []
  );

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isMobile || top === null) return;
    // 🔴 포인터를 손잡이에 묶어 둔다 — 안 하면 손가락이 손잡이를 벗어나는 순간
    //    move 이벤트가 끊겨 패널이 그 자리에 멈춘다.
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dy: e.clientY - top };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    // 🔴 세로만 갱신한다 — 가로는 CSS 가 가운데로 잡고 있고 드래그가 건드리지 않는다.
    setTop(clampTop(e.clientY - d.dy));
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
      // 🔴 `left` 를 여기서 주지 말 것 — CSS 의 가운데 정렬을 덮어써 다시 쏠린다.
      style={top !== null ? { top } : { bottom: 16 }}
    >
      <div
        className="drag-panel-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={`${title} 창을 위아래로 옮기기`}
      >
        <span className="drag-panel-grip" aria-hidden="true" />
        <span className="drag-panel-title">{title}</span>
        <span className="drag-panel-hint">위아래로 이동</span>
      </div>
      <div className="drag-panel-body">{children}</div>
    </div>
  );
}

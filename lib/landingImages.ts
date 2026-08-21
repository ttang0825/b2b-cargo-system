// 랜딩(/) 이미지 경로 모음.
//
// 🔴 **컴포넌트에 경로를 직접 박지 말 것.** 나중에 실제 사진이 준비되면 이 파일의
// 값만 채우면 랜딩 전체가 한 번에 교체된다(11차 지시서 5-1).
//
// ⚠️ **현재는 5종 전부 자리표시자(null) 상태이며, 실제 이미지 교체는 Go-Live 차단
// 항목이다.** null이면 `components/LandingImage.tsx`가 "이미지 준비 중" 회색 상자를
// 대신 그리고, 상자 크기(비율)는 이미지가 있든 없든 동일하므로 레이아웃은 무너지지 않는다.
//
// 규격(11차 지시서 5장 — 시안 실측으로 확정된 값):
//   hero              데스크탑 870×716                    (히어로 배경·배너, 자산 1장)
//   transportTypes    데스크탑 456×304 / 모바일 없음      (이런 운송을 맡고 있습니다)
//   vehicles          데스크탑 272×200 / 모바일 154×104   (차량 형태 4장)
//   icons             데스크탑 64×64   / 모바일 48×48     (선택 이유 카드 4종)
//   portal            데스크탑 1240×720 → 620×360 표시 / 모바일 640×400 → 320×200 표시
//
// ⚠️ 히어로 데스크탑은 **870×716**이 확정값이다(규격서에 있던 520은 폐기됨).
//
// ── 🔴 모바일 전용 자산을 따로 두는 기준: **"글자를 읽어야 하는가"** ─────────────────
// 12차에 `hero.mobile` 키를 **없앴고** `portal.mobile`만 남겼다. 판단 기준은 이것 하나다.
//
//   히어로       트럭 사진. **글자 없음** → 데스크탑 자산 하나로 충분(CSS가 비율만 바꿈)
//   운송관리 캡처  목록 화면. **글자 있음** → 별도 크롭 필요
//
// 제작 1240px 자산을 모바일 320px에 표시하면 축소율이 **26%**라, 캡처 안의 13px 글자가
// **6.7px로 뭉개진다.** 그래서 캡처만 모바일 전용 자산을 쓴다.
// ⚠️ **`hero.mobile`을 다시 만들지 말 것** — 사진에는 판독할 글자가 없어 자산만 늘어난다.
//
// 모바일 캡처는 **카드 뷰**를 찍는다 — 640px 폭에는 목록 표가 안 들어가고, 이 시스템은
// 모바일에서 표를 카드로 전환하기 때문(`.mobile-row-card`).
type LandingImageSrc = string | null;

export type LandingImages = {
  /**
   * 히어로 — 데스크탑은 우측 배경, 모바일은 CTA·신뢰 3줄 아래 배너.
   * ⚠️ 두 화면이 **같은 자산 하나**를 쓴다(비율만 CSS가 바꿈). 사진에 판독할 글자가
   * 없어서 모바일 전용 크롭이 필요 없다 — 위 "글자를 읽어야 하는가" 기준 참고.
   */
  hero: { desktop: LandingImageSrc };
  /** "이런 운송을 맡고 있습니다" 좌측 사진 (모바일에는 노출하지 않음) */
  transportTypes: LandingImageSrc;
  /** 차량 형태 4종. 키 순서가 화면 노출 순서 */
  vehicles: {
    cargo: LandingImageSrc;
    box: LandingImageSrc;
    wing: LandingImageSrc;
    lift: LandingImageSrc;
  };
  /** "위캐리를 선택하는 이유" 카드 아이콘 4종 */
  icons: {
    dispatch: LandingImageSrc;
    price: LandingImageSrc;
    support: LandingImageSrc;
    repeat: LandingImageSrc;
  };
  /**
   * 운송관리 화면 캡처. **모바일 전용 크롭이 반드시 필요하다** — 캡처 안의 글자가
   * 축소되면 뭉개지기 때문(위 기준 참고). `components/LandingImage.tsx`의
   * `mobileSrc` prop으로 넘어가 `<picture>`의 `<source media="(max-width: 760px)">`가 된다.
   */
  portal: { desktop: LandingImageSrc; mobile: LandingImageSrc };
};

export const LANDING_IMAGES: LandingImages = {
  hero: { desktop: null },
  transportTypes: null,
  vehicles: { cargo: null, box: null, wing: null, lift: null },
  icons: { dispatch: null, price: null, support: null, repeat: null },
  portal: { desktop: null, mobile: null },
};

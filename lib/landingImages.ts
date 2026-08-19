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
//   hero              데스크탑 870×716 / 모바일 360×170   (히어로 배경·배너)
//   transportTypes    데스크탑 456×304 / 모바일 없음      (이런 운송을 맡고 있습니다)
//   vehicles          데스크탑 272×200 / 모바일 154×104   (차량 형태 4장)
//   icons             데스크탑 64×64   / 모바일 48×48     (선택 이유 카드 4종)
//   portal            데스크탑 560×240 / 모바일 284×130   (운송관리 화면 캡처)
//
// ⚠️ 히어로 데스크탑은 **870×716**이 확정값이다(규격서에 있던 520은 폐기됨).
type LandingImageSrc = string | null;

export type LandingImages = {
  /** 히어로 — 데스크탑은 우측 배경, 모바일은 CTA·신뢰 3줄 아래 배너 */
  hero: { desktop: LandingImageSrc; mobile: LandingImageSrc };
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
  /** 운송관리 화면 캡처 */
  portal: { desktop: LandingImageSrc; mobile: LandingImageSrc };
};

export const LANDING_IMAGES: LandingImages = {
  hero: { desktop: null, mobile: null },
  transportTypes: null,
  vehicles: { cargo: null, box: null, wing: null, lift: null },
  icons: { dispatch: null, price: null, support: null, repeat: null },
  portal: { desktop: null, mobile: null },
};

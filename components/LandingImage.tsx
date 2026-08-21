// 랜딩(/) 이미지 자리. **실제 사진이 준비되기 전에도 레이아웃이 확정되도록** 크기(비율)를
// 먼저 잡아두는 것이 목적이다(11차 지시서 5장).
//
// - 경로(`src`)는 반드시 `lib/landingImages.ts`의 `LANDING_IMAGES`에서 가져올 것.
//   컴포넌트 호출부에 경로 문자열을 직접 적으면 나중에 교체할 때 랜딩 전체를 뒤져야 한다.
// - `src`가 null이면 "이미지 준비 중" 회색 상자를 그린다. 상자 크기는 이미지가 있을 때와
//   **완전히 동일**하므로, 사진을 넣어도 레이아웃이 밀리지 않는다.
// - 크기·비율은 이 컴포넌트가 정하지 않고 **바깥 CSS 클래스**가 정한다
//   (`.landing-media-hero` 등, `app/globals.css`의 랜딩 블록 참고).
//   화면마다 데스크탑/모바일 비율이 달라서 CSS 미디어쿼리로 다루는 편이 정확하다.
//
// ⚠️ 자리표시자 문구는 "이미지 준비 중"만 쓴다 — 목업 도구가 넣는 안내문
// ("or browse files" 등)이 코드에 섞여 들어가면 안 된다(지시서 5-2).
export default function LandingImage({
  src,
  mobileSrc = null,
  alt,
  className = "",
  /** 다크 배경(히어로) 위에 놓이는 자리표시자는 밝은 회색이 튀어서 어둡게 그린다 */
  dark = false,
}: {
  src: string | null;
  /**
   * 모바일(≤760px) 전용 자산. **캡처처럼 안에 글자가 있는 이미지에만 쓴다** —
   * 데스크탑 자산을 축소하면 글자가 뭉개지기 때문(기준은 `lib/landingImages.ts` 주석).
   * 사진처럼 판독할 글자가 없으면 넘기지 말 것(자산만 늘어난다).
   */
  mobileSrc?: string | null;
  alt: string;
  className?: string;
  dark?: boolean;
}) {
  const cls = ["landing-media", dark ? "landing-media-dark" : "", className].filter(Boolean).join(" ");

  // next/image가 아니라 <img>인 이유: 이 저장소에는 `public/`도 이미지 최적화 설정도
  // 없고, 자리표시자 단계에서 next/image의 width/height 필수 규칙이 오히려 걸림돌이 됨.
  // 실제 사진을 넣을 때 next/image로 바꿀지 함께 검토할 것.
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={src ?? ""} alt={alt} />;

  return (
    <div className={cls}>
      {src == null ? (
        <span className="landing-media-empty" aria-hidden="true">
          이미지 준비 중
        </span>
      ) : mobileSrc ? (
        // 🔴 `.desktop-only`/`.mobile-only`로 두 <img>를 렌더링한 뒤 CSS로 숨기는 방식을
        // 쓰지 말 것 — 그러면 **양쪽 다 내려받을 수 있다.** <picture>는 브라우저가 조건에
        // 맞는 하나만 받는다.
        // ⚠️ 분기점 760px은 헤더가 데스크탑 메뉴 → 햄버거로 바뀌는 지점과 같다
        // (38차 실측). 헤더와 본문이 같은 폭에서 함께 전환되도록 맞춘 것이니 바꾸지 말 것.
        <picture>
          <source media="(max-width: 760px)" srcSet={mobileSrc} />
          {img}
        </picture>
      ) : (
        img
      )}
    </div>
  );
}

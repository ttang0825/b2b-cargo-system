"use client";

import { useEffect, useState } from "react";
import { COMPANY_CONTACT_EMAIL } from "@/lib/companyInfo";

// 푸터에 노출되는 이메일 주소를 수집 프로그램이 긁어가기 어렵게 만드는 컴포넌트.
//
// **동작 방식**: 서버가 내려주는 HTML에는 완성된 주소가 들어있지 않고
// `director [at] designegg.tv` 형태로만 들어있다. 브라우저에서 자바스크립트가 실행된
// 뒤에야 실제 주소와 `mailto:` 링크로 바뀐다. 대부분의 수집 프로그램은 HTML만 훑기
// 때문에 이것만으로도 상당수가 걸러진다.
//
// **자바스크립트가 꺼져 있어도** 사람은 `[at]`을 `@`로 바꿔 읽을 수 있으므로 정보가
// 사라지지 않는다(그래서 이미지나 빈 값으로 처리하지 않았음).
//
// ⚠️ **주소를 prop으로 받지 않고 이 파일이 직접 import한다 — 바꾸지 말 것.**
// 클라이언트 컴포넌트에 prop으로 넘기면 Next.js가 그 값을 HTML 안의 RSC 데이터로
// 직렬화해서 실어보내기 때문에, 화면에는 가려져 있어도 **페이지 소스에는 완성된
// 주소가 그대로 남는다**(실제로 이 방식으로 만들었다가 검증에서 걸렸음).
// import한 상수는 별도 JS 번들에만 들어가므로 HTML에는 전혀 나타나지 않는다.
//
// ⚠️ **약관·개인정보처리방침 본문 안의 이메일에는 이 컴포넌트를 쓰지 말 것.**
// 그쪽은 법정 고지사항이라 평문으로 그대로 보여야 한다(난독화하면 고지 효력에 문제).
export default function ObfuscatedEmail({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const email = COMPANY_CONTACT_EMAIL;
  const [revealed, setRevealed] = useState(false);

  // 첫 렌더는 서버와 동일하게(=가려진 상태) 그려야 hydration 불일치가 나지 않으므로,
  // 마운트 이후에 한 번 더 그린다
  useEffect(() => setRevealed(true), []);

  const [local, domain] = email.split("@");

  if (!revealed) {
    return (
      <span className={className} style={style}>
        {local} [at] {domain}
      </span>
    );
  }

  return (
    <a href={`mailto:${email}`} className={className} style={style}>
      {email}
    </a>
  );
}

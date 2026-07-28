"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    daum: any;
  }
}

type DaumPostcodeData = {
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
};

// 다음(Daum) 우편번호 스크립트를 페이지당 한 번만 로드하는 공용 훅.
// 여러 화면에서 각자 <script> 태그를 붙이던 방식을 하나로 통합.
export function useDaumPostcode() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  const open = useCallback((oncomplete: (data: DaumPostcodeData) => void) => {
    if (!window.daum) return;
    new window.daum.Postcode({ oncomplete }).open();
  }, []);

  return { ready, open };
}

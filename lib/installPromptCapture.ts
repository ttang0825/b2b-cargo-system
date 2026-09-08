/**
 * 설치형 앱(PWA) 설치 신호를 **HTML 을 읽는 순간** 잡아두는 스크립트.
 *
 * 🔴 **왜 인라인 스크립트여야 하나** — 크롬은 `beforeinstallprompt` 를 화면이 뜨자마자
 *    한 번만 쏘는데, 리액트가 붙은 뒤(`useEffect`)에 듣기 시작하면 **그 사이에 지나간
 *    신호를 영영 못 받는다.** 화면이 무거울수록 잘 놓쳐서 「어떤 날은 설치 버튼이 뜨고
 *    어떤 날은 안 뜬다」로 나타난다(PR #127 실사용에서 실제로 겪었다).
 *    그래서 이 스크립트가 먼저 잡아 `window.__wcInstall` 에 넣어두고, 버튼은 그걸 읽는다.
 *
 * 🔴 **`preventDefault()` 를 빼지 말 것** — 브라우저가 자기 설치 배너를 띄워서
 *    우리 버튼과 두 개가 겹친다.
 */
export const INSTALL_PROMPT_CAPTURE = `(function(){
try{
if(window.__wcInstall)return;
var s={evt:null,installed:false};
window.__wcInstall=s;
var fire=function(){try{window.dispatchEvent(new Event("wc-install-change"))}catch(e){}};
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();s.evt=e;fire()});
window.addEventListener("appinstalled",function(){s.evt=null;s.installed=true;fire()});
}catch(e){}
})();`;

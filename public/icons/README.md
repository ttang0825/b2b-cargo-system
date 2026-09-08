# PWA 설치 아이콘

`app/customer/icon.svg` · `app/admin/icon.svg`(탭 파비콘)를 원본으로 만든 PNG다.
**여기 있는 PNG 를 손으로 고치지 말고, 파비콘 SVG 를 고친 뒤 다시 뽑을 것.**

| 파일 | 쓰이는 곳 | 모양 |
|---|---|---|
| `portal-192.png` · `portal-512.png` | `manifest-customer.webmanifest` `purpose: any` | 탭 아이콘과 같은 둥근 사각(모서리 투명) |
| `portal-maskable-512.png` | 같은 manifest `purpose: maskable` | 모서리까지 꽉 참 · W 가 가운데 80% 안 |
| `admin-*` | `manifest-admin.webmanifest` | 위와 같음(블랙 배경) |

`app/customer/apple-icon.png` · `app/admin/apple-icon.png`(180×180)도 같은 원본에서
나온다 — iOS 홈 화면 아이콘이다.

## 규칙

- 🔴 **색은 파비콘 3종과 한 벌이다**(사용자 확정 2026-09-07) — 운송관리는 **화이트 배경 +
  블랙 W**, 내부관리는 **블랙 배경 + 화이트 W**. 공개 사이트(`app/icon.svg`)만 옐로다.
  **로고가 바뀌면 파비콘 3종 + 여기 6개 + apple-icon 2개를 같이 갱신할 것.**
- 🔴 **maskable 은 둥글리지 않는다** — 안드로이드가 원형·둥근사각으로 **자기가** 자른다.
  우리가 미리 둥글리면 두 번 깎여 잘려 보인다. 같은 이유로 `apple-icon` 도 정사각이다(27차).
- 🔴 **maskable 의 W 는 가운데 80% 안에 있어야 한다** — 밖으로 나가면 기기에 따라 잘린다.
  경계에 딱 맞추면 안티에일리어싱이 1px 넘어가므로 여유를 3% 두었다.

## 다시 뽑는 법

파비콘 SVG 에서 배경 색·W 도형·안전영역 배율을 읽어 Chromium 으로 렌더한다.
이 저장소에 렌더 도구가 없어 `npm i --no-save playwright-core` 로 넣고 쓴다
(`package.json` 변경 0 을 유지하려는 것이다).

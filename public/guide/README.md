# 이용가이드 화면 캡처

`/guide`(공개)와 `/customer/guide`(포털)의 `figure` 블록이 쓰는 그림입니다.
`lib/guideContent.ts` 가 경로·크기·설명을 들고 있습니다.

## 🔴 실계정으로 찍지 마십시오

이 저장소는 **public** 입니다. 실제 화주 상호·담당자 이름·연락처가 담긴 화면을 한 번
커밋하면 **git 이력에서 지워지지 않습니다**(PR #148 이 캡처를 아예 안 넣기로 했던 이유가
그것이고, PR #175 리뷰에서 사장님이 캡처를 요청해 **가짜 데이터로 찍는 방식**으로 풀었습니다).

여기 있는 그림은 전부 `scripts/guide-shots.mjs` 가 **Supabase 응답을 가로채 가짜 값을
물려** 찍은 것입니다 — 화면 모양은 실물 그대로이고 담기는 값만 가짜입니다.
상호는 「시험상사」, 연락처는 `010-0000-0000`, 금액·구간도 실제 거래가 아닙니다.

## 다시 만들기

```bash
npm i --no-save playwright-core
NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=mockanon \
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKd0mock...  \
  npx next dev -p 3932
node scripts/guide-shots.mjs 3932
```

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 를 빼면 **「이 기기로 알림 받기」 버튼이 안 그려집니다**
  (그 값이 없으면 부품이 스스로 아무것도 안 그립니다) — `notify-buttons.png` 가 빕니다.
- DSF 2 로 찍어 **절반 크기로 저장**합니다. `lib/guideContent.ts` 의 `width`·`height` 는
  저장된 픽셀 그대로이며, 크기가 어긋나면 검증이 잡습니다.
- 화면을 고쳐 그림이 낡으면 **이 스크립트를 다시 돌리고 `width`·`height` 도 같이** 고칠 것.
